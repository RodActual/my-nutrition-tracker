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

// POST — called by the Apple Shortcut
// Body: { date, weight?, steps?, activeCalories?, restingCalories? }
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, weight, steps, activeCalories, restingCalories } = body;
  if (!date) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });

  try {
    const records = (await redis.get(KEY)) ?? {};
    records[date] = {
      ...(records[date] ?? {}),
      date,
      ...(weight != null && { weight: Number(weight) }),
      ...(steps != null && { steps: Number(steps) }),
      ...(activeCalories != null && { activeCalories: Number(activeCalories) }),
      ...(restingCalories != null && { restingCalories: Number(restingCalories) }),
      syncedAt: new Date().toISOString(),
    };
    await redis.set(KEY, records);
    return NextResponse.json({ ok: true, date, data: records[date] });
  } catch {
    return NextResponse.json({ error: 'Redis write failed' }, { status: 503 });
  }
}
