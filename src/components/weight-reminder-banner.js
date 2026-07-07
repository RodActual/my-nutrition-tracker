'use client';
import { useState, useEffect } from 'react';
import { Scale, X } from 'lucide-react';
import { storage } from '@/lib/storage';

const DISMISS_KEY = 'nt_weigh_reminder_dismissed';

export default function WeightReminderBanner({ onSaved }) {
  const [show, setShow] = useState(false);
  const [weight, setWeight] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(DISMISS_KEY) === today) return;

    const logs = storage.getWeightLogs();
    if (!logs.length) { setShow(true); return; }
    const latest = logs[logs.length - 1].date;
    const daysSince = Math.floor(
      (new Date(today + 'T12:00:00') - new Date(latest + 'T12:00:00')) / 86400000
    );
    setShow(daysSince >= 7);
  }, []);

  if (!show) return null;

  const save = () => {
    const w = Number(weight);
    if (!w || w <= 0) return;
    storage.addWeightLog({ weight: w, date: new Date().toISOString().split('T')[0] });
    setShow(false);
    onSaved?.();
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().split('T')[0]);
    setShow(false);
  };

  return (
    <div className="mx-4 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <Scale size={18} className="text-amber-400 shrink-0" aria-hidden="true" />
        <p className="text-sm text-amber-200 flex-1">Time for your weekly weigh-in</p>
        <button type="button" onClick={dismiss} className="text-amber-400/60 hover:text-amber-300 p-1">
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <input
          type="number"
          step="0.1"
          min="0"
          inputMode="decimal"
          placeholder="Weight (lbs)"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
        />
        <button
          type="button"
          onClick={save}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold rounded-xl px-4 active:scale-95 transition-all"
        >
          Save
        </button>
      </div>
    </div>
  );
}
