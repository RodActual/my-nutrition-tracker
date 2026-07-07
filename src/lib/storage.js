const KEYS = {
  profile: 'nt_profile',
  targets: 'nt_targets',
  logs: 'nt_logs',
  water: 'nt_water',
  weights: 'nt_weights',
  products: 'nt_products',
  steps: 'nt_steps',
};

function read(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function write(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn('localStorage write failed (quota exceeded?)');
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Fire-and-forget push of a day's totals to the server so Apple Shortcuts can sync to Apple Health
function pushDayToServer(date) {
  if (typeof window === 'undefined') return;
  try {
    const logs = read(KEYS.logs, []).filter(l => l.date === date && l.source !== 'AppleHealth');
    const waterLogs = read(KEYS.water, []).filter(w => w.date === date);
    const weightEntry = read(KEYS.weights, []).filter(w => w.date === date).at(-1);

    const calories = logs.reduce((s, l) => s + (l.calories || 0), 0);
    const protein  = logs.reduce((s, l) => s + (l.protein  || 0), 0);
    const carbs    = logs.reduce((s, l) => s + (l.carbs    || 0), 0);
    const fat      = logs.reduce((s, l) => s + (l.fat      || 0), 0);
    const fiber    = logs.reduce((s, l) => s + (l.fiber    || 0), 0);
    const sodium   = logs.reduce((s, l) => s + (l.sodium   || 0), 0);
    const sugar    = logs.reduce((s, l) => s + (l.sugar    || 0), 0);
    const water    = waterLogs.reduce((s, w) => s + (w.amount || 0), 0);

    fetch('/api/nutrition-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        calories, protein, carbs, fat, fiber, sodium, sugar, water,
        ...(weightEntry && { weight: weightEntry.weight }),
      }),
    }).catch(() => {});
  } catch { /* silent */ }
}

export const storage = {
  // Profile
  getProfile: () => read(KEYS.profile, null),
  setProfile: (profile) => write(KEYS.profile, profile),

  // Targets
  getTargets: () => read(KEYS.targets, null),
  setTargets: (targets) => write(KEYS.targets, targets),

  // Food logs
  getLogs: (date) => {
    const all = read(KEYS.logs, []);
    return date ? all.filter(l => l.date === date) : all;
  },
  addLog: (log) => {
    const all = read(KEYS.logs, []);
    const entry = { ...log, id: uid(), timestamp: log.timestamp || new Date().toISOString() };
    write(KEYS.logs, [entry, ...all]);
    pushDayToServer(entry.date);
    return entry;
  },
  updateLog: (id, data) => {
    const all = read(KEYS.logs, []);
    const updated = all.map(l => l.id === id ? { ...l, ...data } : l);
    write(KEYS.logs, updated);
    const date = (updated.find(l => l.id === id) ?? data).date;
    if (date) pushDayToServer(date);
  },
  deleteLog: (id) => {
    const all = read(KEYS.logs, []);
    const entry = all.find(l => l.id === id);
    write(KEYS.logs, all.filter(l => l.id !== id));
    if (entry?.date) pushDayToServer(entry.date);
  },

  // Water logs
  getWaterLogs: (date) => {
    const all = read(KEYS.water, []);
    return date ? all.filter(w => w.date === date) : all;
  },
  addWaterLog: ({ amount, date }) => {
    const all = read(KEYS.water, []);
    const entry = { amount, date, id: uid(), timestamp: new Date().toISOString() };
    write(KEYS.water, [...all, entry]);
    pushDayToServer(date);
    return entry;
  },
  deleteWaterLog: (id) => {
    const all = read(KEYS.water, []);
    const entry = all.find(w => w.id === id);
    write(KEYS.water, all.filter(w => w.id !== id));
    if (entry?.date) pushDayToServer(entry.date);
  },

  // Weight logs
  getWeightLogs: () => read(KEYS.weights, []),
  addWeightLog: ({ weight, date }) => {
    const all = read(KEYS.weights, []);
    const rounded = Math.round(Number(weight) * 10) / 10;
    const entry = { weight: rounded, date, id: uid(), timestamp: new Date().toISOString() };
    write(KEYS.weights, [...all, entry].sort((a, b) => a.date.localeCompare(b.date)));
    pushDayToServer(date);
    return entry;
  },

  // Steps (synced from Apple Health via health-sync)
  getSteps: (date) => {
    const all = read(KEYS.steps, {});
    return date ? (all[date] ?? null) : all;
  },
  setSteps: (date, steps) => {
    const all = read(KEYS.steps, {});
    write(KEYS.steps, { ...all, [date]: Math.round(Number(steps)) });
  },

  // Product history (replaces Firestore products collection)
  getProducts: () => read(KEYS.products, {}),
  setProduct: (key, data) => {
    const all = read(KEYS.products, {});
    write(KEYS.products, { ...all, [key]: { ...data, lastLogged: new Date().toISOString() } });
  },
  searchProducts: (term) => {
    const lower = term.toLowerCase();
    return Object.values(read(KEYS.products, {}))
      .filter(p => (p.product_name || '').toLowerCase().includes(lower))
      .slice(0, 5)
      .map(p => ({ ...p, source: 'History' }));
  },
};
