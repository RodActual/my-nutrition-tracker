'use client';

import { useState, useEffect } from 'react';
import { Trash2, List } from 'lucide-react';
import { storage } from '@/lib/storage';
import { formatShortDate } from '@/lib/trends';

export default function WeightHistory({ onChanged }) {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);

  const refresh = () => {
    setLogs(storage.getWeightLogs().slice().sort((a, b) => b.date.localeCompare(a.date)));
  };

  useEffect(() => { refresh(); }, []);

  const remove = (id, date) => {
    if (!window.confirm(`Delete the weigh-in from ${formatShortDate(date)}?`)) return;
    storage.deleteWeightLog(id);
    refresh();
    onChanged?.();
  };

  if (!logs.length) return null;

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <List size={14} className="text-emerald-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-100">Weigh-in History</p>
          <span className="text-[10px] font-bold text-zinc-500">({logs.length})</span>
        </div>
        <span className="text-xs text-zinc-500">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-1 max-h-80 overflow-y-auto">
          {logs.map(log => (
            <div
              key={log.id}
              className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-3 py-2"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-bold text-slate-100">{log.weight} lbs</span>
                <span className="text-xs text-zinc-500">{formatShortDate(log.date)}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(log.id, log.date)}
                aria-label={`Delete weigh-in from ${formatShortDate(log.date)}`}
                className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
