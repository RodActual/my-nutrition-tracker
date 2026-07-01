const KEYS = {
  profile: 'nt_profile',
  targets: 'nt_targets',
  logs: 'nt_logs',
  water: 'nt_water',
  weights: 'nt_weights',
  products: 'nt_products',
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
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    return entry;
  },
  updateLog: (id, data) => {
    const all = read(KEYS.logs, []);
    write(KEYS.logs, all.map(l => l.id === id ? { ...l, ...data } : l));
  },
  deleteLog: (id) => {
    write(KEYS.logs, read(KEYS.logs, []).filter(l => l.id !== id));
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
    return entry;
  },
  deleteWaterLog: (id) => {
    write(KEYS.water, read(KEYS.water, []).filter(w => w.id !== id));
  },

  // Weight logs
  getWeightLogs: () => read(KEYS.weights, []),
  addWeightLog: ({ weight, date }) => {
    const all = read(KEYS.weights, []);
    const entry = { weight, date, id: uid(), timestamp: new Date().toISOString() };
    write(KEYS.weights, [...all, entry].sort((a, b) => a.date.localeCompare(b.date)));
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
