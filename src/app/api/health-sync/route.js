import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const KEY = 'health_sync';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// GET — client fetches on load to merge into localStorage.
// ?clear=1 wipes all records (recovery from bad Shortcut runs).
// Existing records with legacy date keys are re-normalized on read.
export async function GET(req) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({});
  try {
    if (new URL(req.url).searchParams.get('clear') === '1') {
      await redis.set(KEY, {});
      return NextResponse.json({ ok: true, cleared: true });
    }
    const records = (await redis.get(KEY)) ?? {};
    const cleaned = {};
    for (const rec of Object.values(records)) {
      if (rec && typeof rec === 'object') mergeRecord(cleaned, rec);
    }
    const changed =
      Object.keys(cleaned).length !== Object.keys(records).length ||
      Object.keys(cleaned).some(k => !(k in records));
    if (changed) await redis.set(KEY, cleaned);
    return NextResponse.json(cleaned);
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

// Accept any date format Shortcuts might send ("Jul 4, 2026 at 7:05 PM",
// "7/4/2026", ISO...) and normalize to YYYY-MM-DD.
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[^\x20-\x7E]/g, ' ').replace(' at ', ' ').trim();
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const d = new Date(s);
  if (isNaN(d)) return null;
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mergeRecord(records, { date, weight, steps, activeCalories, restingCalories }) {
  const day = normalizeDate(date);
  if (!day) return false;
  // Zeros mean "no sample found" in the Shortcut — never overwrite real data with 0
  const w = num(weight) || null;
  const s = num(steps) || null;
  const ac = num(activeCalories) || null;
  const rc = num(restingCalories) || null;
  records[day] = {
    ...(records[day] ?? {}),
    date: day,
    ...(w != null && { weight: Math.round(w * 10) / 10 }),
    ...(s != null && { steps: Math.round(s) }),
    ...(ac != null && { activeCalories: Math.round(ac) }),
    ...(rc != null && { restingCalories: Math.round(rc) }),
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
