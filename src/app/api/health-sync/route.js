import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KEY = 'health_sync';

// GET — client fetches on load to merge into localStorage
export async function GET() {
  try {
    const records = (await kv.get(KEY)) ?? {};
    return NextResponse.json(records);
  } catch {
    // KV not configured (local dev) — return empty
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

  try {
    const records = (await kv.get(KEY)) ?? {};
    records[date] = {
      ...(records[date] ?? {}),
      date,
      ...(weight != null && { weight: Number(weight) }),
      ...(steps != null && { steps: Number(steps) }),
      ...(activeCalories != null && { activeCalories: Number(activeCalories) }),
      ...(restingCalories != null && { restingCalories: Number(restingCalories) }),
      syncedAt: new Date().toISOString(),
    };
    await kv.set(KEY, records);
    return NextResponse.json({ ok: true, date, data: records[date] });
  } catch {
    return NextResponse.json({ error: 'KV unavailable' }, { status: 503 });
  }
}
