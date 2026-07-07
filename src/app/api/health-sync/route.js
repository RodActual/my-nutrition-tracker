import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const KEY = 'health_sync';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// GET — client fetches on load to merge into localStorage
export async function GET() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({});
  try {
    const records = (await redis.get(KEY)) ?? {};
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({});
  }
}

function mergeRecord(records, { date, weight, steps, activeCalories, restingCalories }) {
  if (!date) return false;
  records[date] = {
    ...(records[date] ?? {}),
    date,
    ...(weight != null && { weight: Number(weight) }),
    ...(steps != null && { steps: Number(steps) }),
    ...(activeCalories != null && { activeCalories: Number(activeCalories) }),
    ...(restingCalories != null && { restingCalories: Number(restingCalories) }),
    syncedAt: new Date().toISOString(),
  };
  return true;
}

// POST — called by the Apple Shortcut
// Body: { date, weight?, steps?, activeCalories?, restingCalories? }
//   or an array of those objects for historical backfill
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body];
  if (items.length === 0 || !items.some(i => i?.date)) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });

  try {
    const records = (await redis.get(KEY)) ?? {};
    let merged = 0;
    for (const item of items) {
      if (item && typeof item === 'object' && mergeRecord(records, item)) merged++;
    }
    await redis.set(KEY, records);
    return NextResponse.json({ ok: true, merged });
  } catch {
    return NextResponse.json({ error: 'Redis write failed' }, { status: 503 });
  }
}
