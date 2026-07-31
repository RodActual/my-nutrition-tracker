import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

const LEGACY_KEY = 'nutrition_export';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getCode(req) {
  const code = req.headers.get('x-sync-code') ?? new URL(req.url).searchParams.get('code');
  return code && code.length >= 6 ? code : null;
}

function keyFor(code) {
  return 'nutrition_export:' + createHash('sha256').update(String(code)).digest('hex');
}

async function loadRecords(redis, key) {
  let records = (await redis.get(key)) ?? null;
  if (records) return records;
  const legacy = await redis.get(LEGACY_KEY);
  if (legacy && typeof legacy === 'object') {
    await redis.set(key, legacy);
    await redis.del(LEGACY_KEY);
    return legacy;
  }
  return {};
}

// GET — called by the Apple Shortcut to read daily nutrition totals
export async function GET(req) {
  const code = getCode(req);
  if (!code) return NextResponse.json({ error: 'sync code required' }, { status: 401 });
  const redis = getRedis();
  if (!redis) return NextResponse.json({});
  try {
    const records = await loadRecords(redis, keyFor(code));
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({});
  }
}

// POST — called by the app whenever food/water/weight is logged
export async function POST(req) {
  const code = getCode(req);
  if (!code) return NextResponse.json({ error: 'sync code required' }, { status: 401 });
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, calories, protein, carbs, fat, fiber, sodium, sugar, water, weight } = body;
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
  const key = keyFor(code);

  try {
    const records = await loadRecords(redis, key);
    records[date] = {
      date,
      ...(calories != null && { calories: Number(calories) }),
      ...(protein  != null && { protein:  Number(protein)  }),
      ...(carbs    != null && { carbs:    Number(carbs)    }),
      ...(fat      != null && { fat:      Number(fat)      }),
      ...(fiber    != null && { fiber:    Number(fiber)    }),
      ...(sodium   != null && { sodium:   Number(sodium)   }),
      ...(sugar    != null && { sugar:    Number(sugar)    }),
      ...(water    != null && { water:    Number(water)    }),
      ...(weight   != null && { weight:   Number(weight)   }),
      syncedAt: new Date().toISOString(),
    };
    await redis.set(key, records);
    return NextResponse.json({ ok: true, date, data: records[date] });
  } catch {
    return NextResponse.json({ error: 'Redis write failed' }, { status: 503 });
  }
}
