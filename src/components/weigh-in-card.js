'use client';

import { useState, useEffect } from 'react';
import { Scale, Plus, Check } from 'lucide-react';
import { storage } from '@/lib/storage';
import { formatShortDate, formatFullDate } from '@/lib/trends';

export default function WeighInCard({ onSaved }) {
  const [latest, setLatest] = useState(null);
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState('');

  const refresh = () => {
    const logs = storage.getWeightLogs();
    setLatest(logs.length ? logs[logs.length - 1] : null);
  };

  useEffect(() => { refresh(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const loggedToday = latest?.date === today;

  const save = () => {
    const w = Number(weight);
    if (!w || w <= 0) return;
    storage.addWeightLog({ weight: w, date: today });
    setWeight('');
    setEditing(false);
    refresh();
    onSaved?.();
  };

  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-4 flex items-center gap-3">
      <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-2xl shrink-0">
        <Scale size={18} className="text-violet-400" aria-hidden="true" />
      </div>

      {editing ? (
        <>
          <input
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            autoFocus
            placeholder="Weight (lbs)"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            className="flex-1 min-w-0 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={save}
            className="shrink-0 bg-violet-500 hover:bg-violet-400 text-zinc-950 rounded-xl px-4 py-2.5 active:scale-95 transition-all"
            aria-label="Save weight"
          >
            <Check size={16} />
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-[var(--text-primary)]">
              {latest ? latest.weight : '—'}
              <span className="text-xs text-[var(--text-tertiary)] font-bold ml-0.5">lbs</span>
            </p>
            <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
              {latest ? (loggedToday ? 'Weighed in today' : `Last: ${formatFullDate(latest.date)}`) : 'No weigh-ins yet'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 flex items-center gap-1 bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] text-violet-400 text-xs font-bold rounded-xl px-3 py-2.5 active:scale-95 transition-all"
          >
            <Plus size={12} aria-hidden="true" /> Weigh in
          </button>
        </>
      )}
    </div>
  );
}
