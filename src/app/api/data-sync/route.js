import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// The sync code never touches Redis — only its hash, used as the storage key.
function keyFor(code) {
  return 'nt_data:' + createHash('sha256').update(String(code)).digest('hex');
}

function getCode(req) {
  const code = req.headers.get('x-sync-code');
  return code && code.length >= 6 ? code : null;
}

// GET — pull the full data snapshot for this sync code
export async function GET(req) {
  const code = getCode(req);
  if (!code) return NextResponse.json({ error: 'sync code required (6+ chars)' }, { status: 401 });
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
  try {
    const data = (await redis.get(keyFor(code))) ?? null;
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Redis read failed' }, { status: 503 });
  }
}

// POST — store the full data snapshot for this sync code
export async function POST(req) {
  const code = getCode(req);
  if (!code) return NextResponse.json({ error: 'sync code required (6+ chars)' }, { status: 401 });
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !body.updatedAt) {
    return NextResponse.json({ error: 'snapshot with updatedAt required' }, { status: 400 });
  }
  try {
    await redis.set(keyFor(code), body);
    return NextResponse.json({ ok: true, updatedAt: body.updatedAt });
  } catch {
    return NextResponse.json({ error: 'Redis write failed' }, { status: 503 });
  }
}
