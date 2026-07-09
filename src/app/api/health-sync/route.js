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

// Shortcuts often sends numbers as formatted text ("9,131", "185.2 lb") — sanitize.
function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function mergeRecord(records, { date, weight, steps, activeCalories, restingCalories }) {
  if (!date) return false;
  const w = num(weight), s = num(steps), ac = num(activeCalories), rc = num(restingCalories);
  records[date] = {
    ...(records[date] ?? {}),
    date,
    ...(w != null && { weight: w }),
    ...(s != null && { steps: s }),
    ...(ac != null && { activeCalories: ac }),
    ...(rc != null && { restingCalories: rc }),
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
