import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

const LEGACY_KEY = 'health_sync';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Per-user key derived from the sync code (header or ?code= for Shortcut convenience)
function getCode(req) {
  const code = req.headers.get('x-sync-code') ?? new URL(req.url).searchParams.get('code');
  return code && code.length >= 6 ? code : null;
}

function keyFor(code) {
  return 'health_sync:' + createHash('sha256').update(String(code)).digest('hex');
}

// Shortcuts often sends numbers as formatted text ("9,131", "185.2 lb") — sanitize.
function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Accept any date format Shortcuts might send and normalize to YYYY-MM-DD.
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

// One-time migration: the first authenticated caller claims any legacy
// un-scoped records, then the legacy key is deleted.
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

// GET — pull records for this sync code. ?clear=1 wipes them (auth required).
export async function GET(req) {
  const code = getCode(req);
  if (!code) return NextResponse.json({ error: 'sync code required' }, { status: 401 });
  const redis = getRedis();
  if (!redis) return NextResponse.json({});
  const key = keyFor(code);
  try {
    if (new URL(req.url).searchParams.get('clear') === '1') {
      await redis.set(key, {});
      return NextResponse.json({ ok: true, cleared: true });
    }
    const records = await loadRecords(redis, key);
    const cleaned = {};
    for (const rec of Object.values(records)) {
      if (rec && typeof rec === 'object') mergeRecord(cleaned, rec);
    }
    const changed =
      Object.keys(cleaned).length !== Object.keys(records).length ||
      Object.keys(cleaned).some(k => !(k in records));
    if (changed) await redis.set(key, cleaned);
    return NextResponse.json(cleaned);
  } catch {
    return NextResponse.json({});
  }
}

// POST — called by the Apple Shortcut. Single object or array (backfill).
export async function POST(req) {
  const code = getCode(req);
  if (!code) return NextResponse.json({ error: 'sync code required' }, { status: 401 });
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
  const key = keyFor(code);

  try {
    const records = await loadRecords(redis, key);
    let merged = 0;
    for (const item of items) {
      if (item && typeof item === 'object' && mergeRecord(records, item)) merged++;
    }
    await redis.set(key, records);
    return NextResponse.json({ ok: true, merged });
  } catch {
    return NextResponse.json({ error: 'Redis write failed' }, { status: 503 });
  }
}
