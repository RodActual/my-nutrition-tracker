'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { storage } from '@/lib/storage';

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function calculateTargets({ age, weight, height, goalWeight, activityLevel }) {
  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const gw = Number(goalWeight) || w;
  if (!w || !h || !a) return null;

  // Mifflin-St Jeor BMR (assuming male; no sex field yet — conservative estimate)
  const bmr = 10 * (w * 0.453592) + 6.25 * (h * 2.54) - 5 * a + 5;
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55);

  // Calorie goal: deficit if goal < current, surplus if goal > current
  const diff = gw - w;
  const adjustment = diff < 0 ? Math.max(diff * 11, -750) : Math.min(diff * 11, 500);
  const goalCalories = Math.round(tdee + adjustment);

  // Macros: 1g protein per lb bodyweight, 25% fat, carbs fill remainder
  const proteinG = Math.round(w * 0.9);
  const fatG = Math.round((goalCalories * 0.25) / 9);
  const carbsG = Math.round((goalCalories - proteinG * 4 - fatG * 9) / 4);

  return {
    calories: goalCalories,
    protein: proteinG,
    carbs: Math.max(carbsG, 0),
    fat: fatG,
  };
}

export default function SettingsModal({ currentProfile, onClose }) {
  const [name, setName] = useState(currentProfile?.name ?? '');
  const [age, setAge] = useState(currentProfile?.age ?? '');
  const [weight, setWeight] = useState(currentProfile?.weight ?? '');
  const [height, setHeight] = useState(currentProfile?.height ?? '');
  const [goalWeight, setGoalWeight] = useState(currentProfile?.goalWeight ?? '');
  const [activityLevel, setActivityLevel] = useState(currentProfile?.activityLevel ?? 'sedentary');

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
        </div>

        <button
          type="button"
          onClick={() => {
            const result = calculateTargets({ age, weight, height, goalWeight, activityLevel });
            if (!result) {
              alert('Enter age, weight, and height to auto-calculate targets.');
              return;
            }
            setCalories(String(result.calories));
            setProtein(String(result.protein));
            setCarbs(String(result.carbs));
            setFat(String(result.fat));
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
