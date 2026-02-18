'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { calculateTargets, lbsToKg, ftInToCm } from '@/lib/nutrition';

export default function SettingsModal({ userId, currentProfile, onClose }) {
  const [formData, setFormData] = useState({
    weight: currentProfile?.weight || '',
    heightFt: currentProfile?.heightFt || '',
    heightIn: currentProfile?.heightIn || '',
    age: currentProfile?.age || '',
    goal: currentProfile?.goal || 'maintain',
    // FIX: gender and activityLevel are now editable. Previously they were
    // initialized from currentProfile but had no inputs, so users could never
    // update them after the initial onboarding — leading to permanently stale
    // macro targets (e.g. a female user always calculated as male).
    gender: currentProfile?.gender || 'male',
    activityLevel: currentProfile?.activityLevel || 1.2
  });

  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    const weightLbs = parseFloat(formData.weight);
    const weightKg = lbsToKg(weightLbs);
    const heightCm = ftInToCm(parseInt(formData.heightFt), parseInt(formData.heightIn));
    
    const newTargets = calculateTargets(
      weightKg, 
      heightCm, 
      parseInt(formData.age), 
      formData.gender, 
      parseFloat(formData.activityLevel),
      formData.goal
    );

    const waterGoalOz = Math.round(weightLbs * 0.6);

    try {
      await updateDoc(doc(db, "users", userId), {
        profile: {
          ...formData,
          weightKg,
          heightCm,
          waterGoalOz,
          lastUpdated: new Date().toISOString()
        },
        targets: newTargets
      });

      await addDoc(collection(db, "users", userId, "weightLogs"), {
        weight: weightLbs,
        date: new Date().toISOString()
      });

      alert(`Profile Updated! Your new daily water goal is ${waterGoalOz}oz.`);
      onClose();
    } catch (error) {
      console.error("Update failed:", error);
      alert("Error updating settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-sm h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-black tracking-tight">Settings</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-black hover:bg-slate-200 transition-colors">✕</button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 pb-20">
          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Current Weight (lbs)</label>
            <input 
              type="number" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black focus:border-blue-500 outline-none transition-all"
              value={formData.weight}
              onChange={e => setFormData({...formData, weight: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Height (ft)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black focus:border-blue-500 outline-none"
                value={formData.heightFt}
                onChange={e => setFormData({...formData, heightFt: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Height (in)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black focus:border-blue-500 outline-none"
                value={formData.heightIn}
                onChange={e => setFormData({...formData, heightIn: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Age</label>
            <input 
              type="number" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black focus:border-blue-500 outline-none"
              value={formData.age}
              onChange={e => setFormData({...formData, age: e.target.value})}
              required
            />
          </div>

          {/* FIX: Added gender selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Biological Sex</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black focus:border-blue-500 outline-none appearance-none"
              value={formData.gender}
              onChange={e => setFormData({...formData, gender: e.target.value})}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* FIX: Added activity level selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Activity Level</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black focus:border-blue-500 outline-none appearance-none"
              value={formData.activityLevel}
              onChange={e => setFormData({...formData, activityLevel: e.target.value})}
            >
              <option value={1.2}>Sedentary (little or no exercise)</option>
              <option value={1.375}>Lightly Active (1–3 days/week)</option>
              <option value={1.55}>Moderately Active (3–5 days/week)</option>
              <option value={1.725}>Very Active (6–7 days/week)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Your Goal</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-black focus:border-blue-500 outline-none appearance-none"
              value={formData.goal}
              onChange={e => setFormData({...formData, goal: e.target.value})}
            >
              <option value="maintain">Maintain Weight</option>
              <option value="lose">Lose Weight</option>
              <option value="gain">Gain Weight</option>
            </select>
          </div>

          <div className="pt-4">
            <button 
              disabled={saving}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {saving ? 'SAVING DATA...' : 'UPDATE PROFILE'}
            </button>
            <p className="text-[9px] text-center text-slate-900 mt-4 font-bold uppercase tracking-tighter">
              Updating weight automatically adjusts your macro targets and hydration goal.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}