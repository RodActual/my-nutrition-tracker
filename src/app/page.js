'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/dashboard';
import SyncLogin from '@/components/sync-login';
import PullToRefresh from '@/components/pull-to-refresh';
import { storage, getSyncCode, pullRemoteData } from '@/lib/storage';

async function syncHealthData() {
  try {
    const code = getSyncCode();
    if (!code) return;
    const res = await fetch('/api/health-sync', {
      cache: 'no-store',
      headers: { 'x-sync-code': code },
    });
    if (!res.ok) return;
    const records = await res.json(); // { "2026-07-04": { weight, steps, ... }, ... }

    for (const entry of Object.values(records)) {
      if (!entry?.date) continue;

      // Merge weight log if present and not already logged that day
      if (entry.weight) {
        const existing = storage.getWeightLogs();
        const alreadyLogged = existing.some(l => l.date === entry.date);
        if (!alreadyLogged) {
          storage.addWeightLog({ weight: entry.weight, date: entry.date });
        }
      }

      // Steps go straight into their own store (idempotent overwrite)
      if (entry.steps) {
        storage.setSteps(entry.date, entry.steps);
      }

      // Merge active calories as a log entry if present and not already synced
      if (entry.activeCalories) {
        const dayLogs = storage.getLogs(entry.date);
        const alreadySynced = dayLogs.some(l => l.source === 'AppleHealth' && l.date === entry.date);
        if (!alreadySynced) {
          storage.addLog({
            name: 'Active Calories Burned',
            calories: -Math.round(entry.activeCalories),
            protein: 0, carbs: 0, fat: 0,
            fiber: 0, sodium: 0, sugar: 0,
            source: 'AppleHealth',
            date: entry.date,
            timestamp: new Date(entry.date + 'T12:00:00').toISOString(),
          });
        }
      }

      // Merge steps
      if (entry.steps) {
        const existing = storage.getSteps(entry.date);
        if (existing !== Math.round(entry.steps)) {
          storage.setSteps(entry.date, entry.steps);
        }
      }
    }
  } catch {
    // Sync failure is silent — app works fine without it
  }
}

export default function Home() {
  const [phase, setPhase] = useState('loading'); // loading | login | ready

  useEffect(() => {
    if (!getSyncCode()) {
      setPhase('login');
      return;
    }
    pullRemoteData()
      .then(() => syncHealthData())
      .finally(() => setPhase('ready'));
  }, []);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === 'login') {
    return (
      <SyncLogin
        onDone={() => {
          syncHealthData().finally(() => setPhase('ready'));
        }}
      />
    );
  }

  return (
    <PullToRefresh>
      <Dashboard />
    </PullToRefresh>
  );
}
