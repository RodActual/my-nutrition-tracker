import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'health-sync.json');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET — client fetches on load to merge into localStorage
export async function GET() {
  return NextResponse.json(readStore());
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

  const store = readStore();
  store[date] = {
    ...(store[date] ?? {}),
    date,
    ...(weight != null && { weight: Number(weight) }),
    ...(steps != null && { steps: Number(steps) }),
    ...(activeCalories != null && { activeCalories: Number(activeCalories) }),
    ...(restingCalories != null && { restingCalories: Number(restingCalories) }),
    syncedAt: new Date().toISOString(),
  };
  writeStore(store);

  return NextResponse.json({ ok: true, date, data: store[date] });
}
