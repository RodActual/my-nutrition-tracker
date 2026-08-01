'use client';

import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { storage } from '@/lib/storage';
import { movingAverage } from '@/lib/trends';

export default function GoalProgressCard({ profile, onClick }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    const logs = storage.getWeightLogs();
    if (!logs.length) { setState({ noLogs: true }); return; }

    const goal = Number(profile?.goalWeight);
    const start = logs[0].weight;

    const smoothed = movingAverage(logs.map(l => ({ weight: l.weight })), 'weight');
    const current = smoothed[smoothed.length - 1].ma ?? logs[logs.length - 1].weight;

    if (!goal || goal === start) {
      setState({ noGoal: !goal, maintaining: goal === start, current });
      return;
    }

    const totalDelta = start - goal; // positive = losing, negative = gaining
    const madeDelta = start - current;
    const pct = Math.max(0, Math.min(100, Math.round((madeDelta / totalDelta) * 100)));
    const remaining = Math.round(Math.abs(current - goal) * 10) / 10;

    setState({ start, current: Math.round(current * 10) / 10, goal, pct, remaining, losing: totalDelta > 0 });
  }, [profile]);

  if (!state) return null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--accent)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Goal Progress</p>
        </div>
        <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Trends →</span>
      </div>

      {state.noLogs && (
        <p className="text-[var(--text-tertiary)] text-sm">Log your weight to start tracking progress</p>
      )}

      {state.noGoal && !state.noLogs && (
        <p className="text-[var(--text-tertiary)] text-sm">
          Current: <span className="text-[var(--text-primary)] font-semibold">{Math.round(state.current * 10) / 10} lbs</span> — set a goal weight in Settings to track progress
        </p>
      )}

      {state.maintaining && (
        <p className="text-[var(--text-tertiary)] text-sm">
          Maintaining at <span className="text-[var(--text-primary)] font-semibold">{Math.round(state.current * 10) / 10} lbs</span>
        </p>
      )}

      {!state.noLogs && !state.noGoal && !state.maintaining && (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-2xl font-black text-[var(--text-primary)]">{state.pct}%</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {state.remaining} lbs to {state.losing ? 'lose' : 'gain'}
            </p>
          </div>
          <div className="h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${state.pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-semibold text-[var(--text-tertiary)]">
            <span>Start {state.start}</span>
            <span className="text-[var(--text-primary)]">Now {state.current}</span>
            <span>Goal {state.goal}</span>
          </div>
        </>
      )}
    </button>
  );
}
