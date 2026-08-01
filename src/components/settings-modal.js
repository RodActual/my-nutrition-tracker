'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Cloud, Download, LogOut } from 'lucide-react';
import {
  storage, pushAllData, pullRemoteData, getLastSync, clearSyncCode, exportAllData,
} from '@/lib/storage';
import { calculateTargets, HEALTH_PROFILES, getGoalMode, getDefaultRate } from '@/lib/trends';

const LOSE_RATES = [0.5, 1.0, 1.5, 2.0];
const GAIN_RATES = [0.25, 0.5, 0.75, 1.0];

function GoalPaceSection({ weight, goalWeight, rate, setRate }) {
  const mode = getGoalMode({ weight, goalWeight });

  if (mode === 'maintain') {
    return (
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Goal Pace</label>
        <p className="text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
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
      <label className="block text-xs text-zinc-400 mb-1">
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
                ? 'bg-emerald-500 text-zinc-950 border-emerald-500'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-zinc-500 mt-1">lbs/week</p>
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
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 mt-6">Sync & Backup</p>
      <div className="bg-zinc-800/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Cloud size={14} className="text-emerald-400" aria-hidden="true" />
          {lastSync
            ? `Last synced ${new Date(lastSync).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
            : 'Not synced yet'}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={syncNow}
            disabled={busy}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-emerald-400 text-xs font-semibold rounded-xl py-2.5"
          >
            {busy ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            type="button"
            onClick={exportData}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-slate-200 text-xs font-semibold rounded-xl py-2.5 flex items-center justify-center gap-1.5"
          >
            <Download size={13} aria-hidden="true" /> Export
          </button>
          <button
            type="button"
            onClick={logOut}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-red-400 text-xs font-semibold rounded-xl py-2.5 flex items-center justify-center gap-1.5"
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
      <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-10 overflow-y-auto max-h-[85vh]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-slate-100">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 mt-5">Profile</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Age</label>
            <input
              type="number"
              min="0"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Weight (lbs)</label>
            <input
              type="number"
              min="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Height (inches)</label>
            <input
              type="number"
              min="0"
              value={height}
              onChange={e => setHeight(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Goal Weight (lbs)</label>
            <input
              type="number"
              min="0"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <GoalPaceSection weight={weight} goalWeight={goalWeight} rate={goalRate} setRate={setGoalRate} />
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Activity Level</label>
            <select
              value={activityLevel}
              onChange={e => setActivityLevel(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very Active</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Health Profile</label>
            <select
              value={healthProfile}
              onChange={e => setHealthProfile(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            >
              {Object.entries(HEALTH_PROFILES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="text-[10px] text-zinc-500 mt-1">
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
          className="mt-5 w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-400 text-sm font-medium rounded-xl py-3 transition-colors"
        >
          <Sparkles size={15} aria-hidden="true" />
          Auto-calculate targets
        </button>

        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 mt-5">Daily Targets</p>
        <p className="text-xs text-zinc-500 -mt-2 mb-3">Auto-calculated or enter manually</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Calories</label>
            <input
              type="number"
              min="0"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Protein (g)</label>
            <input
              type="number"
              min="0"
              value={protein}
              onChange={e => setProtein(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Carbs (g)</label>
            <input
              type="number"
              min="0"
              value={carbs}
              onChange={e => setCarbs(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fat (g)</label>
            <input
              type="number"
              min="0"
              value={fat}
              onChange={e => setFat(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Water (oz)</label>
            <input
              type="number"
              min="0"
              value={water}
              onChange={e => setWater(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <SyncSection />

        <button
          onClick={handleSave}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-2xl py-3 mt-6"
        >
          Save
        </button>
      </div>
    </div>
  );
}
