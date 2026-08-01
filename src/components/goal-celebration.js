'use client';

import { useState, useEffect } from 'react';
import { Trophy, Target, Scale } from 'lucide-react';
import { storage } from '@/lib/storage';
import { movingAverage, calculateTargets, getBestTDEE } from '@/lib/trends';

const CELEBRATED_KEY = 'nt_goal_celebrated';

// Trend weight = last 7-day moving average of weigh-ins
function getTrendWeight() {
  const logs = storage.getWeightLogs();
  if (!logs.length) return null;
  const smoothed = movingAverage(logs.map(l => ({ weight: l.weight })), 'weight');
  return smoothed[smoothed.length - 1].ma;
}

export default function GoalCelebration({ profile, onUpdated }) {
  const [show, setShow] = useState(false);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    const goal = Number(profile?.goalWeight);
    const start = Number(profile?.weight);
    if (!goal || !start || goal === start) return;
    const t = getTrendWeight();
    if (t == null) return;

    const losing = goal < start;
    const reached = losing ? t <= goal + 0.2 : t >= goal - 0.2;
    if (!reached) return;

    // Celebrate each distinct goal value only once
    if (typeof window !== 'undefined' && localStorage.getItem(CELEBRATED_KEY) === String(goal)) return;
    setTrend(t);
    setShow(true);
  }, [profile]);

  if (!show) return null;

  const goal = Number(profile.goalWeight);

  const markCelebrated = () => {
    localStorage.setItem(CELEBRATED_KEY, String(goal));
    setShow(false);
  };

  const switchToMaintenance = () => {
    const current = Math.round((trend ?? goal) * 10) / 10;
    const newProfile = { ...profile, weight: current, goalWeight: current };
    storage.setProfile(newProfile);
    const best = getBestTDEE(newProfile);
    const targets = calculateTargets(newProfile);
    if (targets) {
      // Prefer measured TDEE for the maintenance calorie number when available
      const calories = best?.source === 'adaptive' ? best.tdee : targets.calories;
      const prev = storage.getTargets() ?? {};
      storage.setTargets({ ...prev, ...targets, calories });
    }
    markCelebrated();
    onUpdated?.();
  };

  const setNewGoal = () => {
    markCelebrated();
    onUpdated?.('open-settings');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-6">
      <div className="w-full max-w-sm bg-[var(--surface)] rounded-3xl border border-[var(--accent-border)] p-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-full flex items-center justify-center mb-4">
          <Trophy size={28} className="text-[var(--accent)]" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-[var(--text-primary)] mb-1">Goal reached!</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Your trend weight hit <span className="text-[var(--accent)] font-bold">{goal} lbs</span>. That took consistency — nice work.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={switchToMaintenance}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-semibold rounded-2xl py-3 flex items-center justify-center gap-2"
          >
            <Scale size={16} aria-hidden="true" /> Switch to maintenance
          </button>
          <button
            type="button"
            onClick={setNewGoal}
            className="w-full bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] text-[var(--text-primary)] font-semibold rounded-2xl py-3 flex items-center justify-center gap-2"
          >
            <Target size={16} aria-hidden="true" /> Set a new goal
          </button>
          <button
            type="button"
            onClick={markCelebrated}
            className="w-full text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider py-2"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
