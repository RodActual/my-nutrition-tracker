'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Cloud, Download, LogOut, Palette } from 'lucide-react';
import {
  storage, pushAllData, pullRemoteData, getLastSync, clearSyncCode, exportAllData,
} from '@/lib/storage';
import { calculateTargets, HEALTH_PROFILES, getGoalMode, getDefaultRate } from '@/lib/trends';
import { ACCENTS, getStoredMode, getStoredAccent, setMode, setAccent } from '@/lib/theme';

const MODES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function AppearanceSection() {
  const [mode, setModeState] = useState('system');
  const [accent, setAccentState] = useState('emerald');

  useEffect(() => {
    setModeState(getStoredMode());
    setAccentState(getStoredAccent());
  }, []);

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 mt-6">Appearance</p>
      <div className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-2xl p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-secondary)]">
            <Palette size={14} className="text-[var(--accent)]" aria-hidden="true" />
            Theme
          </div>
          <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-1">
            {MODES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setModeState(m.id); setMode(m.id); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === m.id ? 'bg-[var(--accent)] text-zinc-950' : 'text-[var(--text-secondary)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-2">Accent Color</p>
          <div className="flex gap-2">
            {ACCENTS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => { setAccentState(a.id); setAccent(a.id); }}
                aria-label={a.label}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: a.swatch,
                  boxShadow: accent === a.id ? `0 0 0 2px var(--surface), 0 0 0 4px ${a.swatch}` : 'none',
                }}
              >
                {accent === a.id && <span className="w-2 h-2 bg-white rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const LOSE_RATES = [0.5, 1.0, 1.5, 2.0];
const GAIN_RATES = [0.25, 0.5, 0.75, 1.0];

function GoalPaceSection({ weight, goalWeight, rate, setRate }) {
  const mode = getGoalMode({ weight, goalWeight });

  if (mode === 'maintain') {
    return (
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">Goal Pace</label>
        <p className="text-sm text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3">
          Maintaining current weight
        </p>
      </div>
    );
  }

  const rates = mode === 'lose' ? LOSE_RATES : GAIN_RATES;
  const warnAbove = mode === 'lose' ? 1.5 : 0.5;
  const effectiveRate = Number(rate) || getDefaultRate(mode);
  const isWarning = effectiveRate > warnAbove;

  return (
    <div>
      <label className="block text-xs text-[var(--text-secondary)] mb-1">
        Target pace ({mode === 'lose' ? 'losing' : 'gaining'})
      </label>
      <div className="flex gap-2">
        {rates.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setRate(r)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              effectiveRate === r
                ? 'bg-[var(--accent)] text-zinc-950 border-[var(--accent)]'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border-2)]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">lbs/week</p>
      {isWarning && (
        <p className={`text-[11px] mt-2 leading-relaxed ${mode === 'lose' ? 'text-red-400' : 'text-amber-400'}`}>
          {mode === 'lose'
            ? 'Losing more than 1.5 lbs/week is an aggressive rate that risks muscle loss and isn\'t recommended without medical supervision.'
            : 'Gaining faster than 0.5 lbs/week typically adds more fat than muscle.'}
        </p>
      )}
    </div>
  );
}

function SyncSection() {
  const [lastSync, setLastSync] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLastSync(getLastSync()); }, []);

  const syncNow = async () => {
    setBusy(true);
    try {
      await pullRemoteData();
      await pushAllData();
      setLastSync(getLastSync());
    } finally {
      setBusy(false);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(exportAllData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutritrack-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logOut = () => {
    if (!window.confirm('Log out of sync? Your data stays on this device and in the cloud — you\'ll just need your sync code to reconnect.')) return;
    clearSyncCode();
    window.location.reload();
  };

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 mt-6">Sync & Backup</p>
      <div className="bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Cloud size={14} className="text-[var(--accent)]" aria-hidden="true" />
          {lastSync
            ? `Last synced ${new Date(lastSync).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
            : 'Not synced yet'}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={syncNow}
            disabled={busy}
            className="bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] disabled:opacity-50 text-[var(--accent)] text-xs font-semibold rounded-xl py-2.5"
          >
            {busy ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            type="button"
            onClick={exportData}
            className="bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] text-[var(--text-primary)] text-xs font-semibold rounded-xl py-2.5 flex items-center justify-center gap-1.5"
          >
            <Download size={13} aria-hidden="true" /> Export
          </button>
          <button
            type="button"
            onClick={logOut}
            className="bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] text-red-400 text-xs font-semibold rounded-xl py-2.5 flex items-center justify-center gap-1.5"
          >
            <LogOut size={13} aria-hidden="true" /> Log out
          </button>
        </div>
      </div>
    </>
  );
}

export default function SettingsModal({ currentProfile, onClose }) {
  const [name, setName] = useState(currentProfile?.name ?? '');
  const [age, setAge] = useState(currentProfile?.age ?? '');
  const [weight, setWeight] = useState(currentProfile?.weight ?? '');
  const [height, setHeight] = useState(currentProfile?.height ?? '');
  const [goalWeight, setGoalWeight] = useState(currentProfile?.goalWeight ?? '');
  const [activityLevel, setActivityLevel] = useState(currentProfile?.activityLevel ?? 'sedentary');
  const [healthProfile, setHealthProfile] = useState(currentProfile?.healthProfile ?? 'normal');
  const [goalRate, setGoalRate] = useState(currentProfile?.goalRateLbsPerWeek ?? '');

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [water, setWater] = useState(currentProfile?.waterGoalOz ?? '');

  useEffect(() => {
    const t = storage.getTargets();
    if (t) {
      setCalories(t.calories ?? '');
      setProtein(t.protein ?? '');
      setCarbs(t.carbs ?? '');
      setFat(t.fat ?? '');
      setWater(t.water ?? t.waterGoal ?? '');
    }
  }, []);

  const handleSave = () => {
    if (!calories || isNaN(Number(calories)) || Number(calories) <= 0) {
      alert('Please enter a valid daily calorie target.');
      return;
    }

    const parsedAge = age === '' ? null : Number(age);
    const parsedWeight = weight === '' ? null : Number(weight);
    const parsedHeight = height === '' ? null : Number(height);
    const parsedGoalWeight = goalWeight === '' ? null : Number(goalWeight);
    const parsedWater = water === '' ? null : Number(water);
    const parsedCalories = calories === '' ? null : Number(calories);
    const parsedProtein = protein === '' ? null : Number(protein);
    const parsedCarbs = carbs === '' ? null : Number(carbs);
    const parsedFat = fat === '' ? null : Number(fat);

    storage.setProfile({
      name,
      age: parsedAge,
      weight: parsedWeight,
      height: parsedHeight,
      goalWeight: parsedGoalWeight,
      activityLevel,
      healthProfile,
      goalRateLbsPerWeek: goalRate === '' ? null : Number(goalRate),
      waterGoalOz: parsedWater,
    });
    storage.setTargets({
      calories: parsedCalories,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fat: parsedFat,
      water: parsedWater,
    });
    if (currentProfile?.weight != null && parsedWeight != null && Number(currentProfile.weight) !== parsedWeight) {
      storage.addWeightLog({ weight: parsedWeight, date: new Date().toISOString().split('T')[0] });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-[var(--surface)] rounded-t-3xl w-full max-w-lg p-6 pb-10 overflow-y-auto max-h-[85vh]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 mt-5">Profile</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Age</label>
            <input
              type="number"
              min="0"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Weight (lbs)</label>
            <input
              type="number"
              min="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Height (inches)</label>
            <input
              type="number"
              min="0"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Goal Weight (lbs)</label>
            <input
              type="number"
              min="0"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <GoalPaceSection weight={weight} goalWeight={goalWeight} rate={goalRate} setRate={setGoalRate} />
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Activity Level</label>
            <select
              value={activityLevel}
              onChange={e => setActivityLevel(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very Active</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Health Profile</label>
            <select
              value={healthProfile}
              onChange={e => setHealthProfile(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              {Object.entries(HEALTH_PROFILES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
              General guideline-based presets, not medical advice — consult your doctor for personalized targets.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const result = calculateTargets({ age, weight, height, goalWeight, activityLevel, healthProfile, goalRateLbsPerWeek: goalRate });
            if (!result) {
              alert('Enter age, weight, and height to auto-calculate targets.');
              return;
            }
            setCalories(String(result.calories));
            setProtein(String(result.protein));
            setCarbs(String(result.carbs));
            setFat(String(result.fat));
            setWater(String(result.water));
          }}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] text-[var(--accent)] text-sm font-medium rounded-xl py-3 transition-colors"
        >
          <Sparkles size={15} aria-hidden="true" />
          Auto-calculate targets
        </button>

        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 mt-5">Daily Targets</p>
        <p className="text-xs text-[var(--text-tertiary)] -mt-2 mb-3">Auto-calculated or enter manually</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Calories</label>
            <input
              type="number"
              min="0"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Protein (g)</label>
            <input
              type="number"
              min="0"
              value={protein}
              onChange={e => setProtein(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Carbs (g)</label>
            <input
              type="number"
              min="0"
              value={carbs}
              onChange={e => setCarbs(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Fat (g)</label>
            <input
              type="number"
              min="0"
              value={fat}
              onChange={e => setFat(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Water (oz)</label>
            <input
              type="number"
              min="0"
              value={water}
              onChange={e => setWater(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <AppearanceSection />
        <SyncSection />

        <button
          onClick={handleSave}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-semibold rounded-2xl py-3 mt-6"
        >
          Save
        </button>
      </div>
    </div>
  );
}
