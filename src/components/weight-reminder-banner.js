'use client';
import { useState, useEffect } from 'react';
import { Scale } from 'lucide-react';
import { storage } from '@/lib/storage';

export default function WeightReminderBanner({ onLogWeight }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const logs = storage.getWeightLogs();
    const today = new Date().toISOString().split('T')[0];
    const loggedToday = logs.some(l => l.date === today);
    setShow(!loggedToday);
  }, []);

  if (!show) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
      <Scale size={18} className="text-amber-400" aria-hidden="true" />
      <p className="text-sm text-amber-200 flex-1">Log your weight today to track progress</p>
      <button
        type="button"
        className="text-xs font-semibold text-amber-400 hover:text-amber-300"
        onClick={() => { setShow(false); onLogWeight?.(); }}
      >
        Log now
      </button>
    </div>
  );
}
