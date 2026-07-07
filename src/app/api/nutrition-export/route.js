import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const KEY = 'nutrition_export';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// GET — called by Apple Shortcut to read daily nutrition totals
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

// POST — called by the app whenever food/water/weight is logged
// Body: { date, calories, protein, carbs, fat, fiber, sodium, sugar, water, weight }
export async function POST(req) {
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

  try {
    const records = (await redis.get(KEY)) ?? {};
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
    await redis.set(KEY, records);
    return NextResponse.json({ ok: true, date, data: records[date] });
  } catch {
    return NextResponse.json({ error: 'Redis write failed' }, { status: 503 });
  }
}
