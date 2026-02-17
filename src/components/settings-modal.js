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
    
    // 1. Calculate Nutritional Targets
    const newTargets = calculateTargets(
      weightKg, 
      heightCm, 
      parseInt(formData.age), 
      formData.gender, 
      formData.activityLevel, 
      formData.goal
    );

    // 2. Calculate Water Goal (0.6oz per lb of body weight)
    const waterGoalOz = Math.round(weightLbs * 0.6);

    try {
      // 3. Update the main profile with new targets AND water goal
      await updateDoc(doc(db, "users", userId), {
        profile: {
          ...formData,
          weightKg,
          heightCm,
          waterGoalOz, // New dynamic hydration target
          lastUpdated: new Date().toISOString()
        },
        targets: newTargets
      });

      // 4. Log weight to the history collection for the chart
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Settings</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 pb-20">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Weight (lbs)</label>
            <input 
              type="number" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-blue-500 outline-none transition-all"
              value={formData.weight}
              onChange={e => setFormData({...formData, weight: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Height (ft)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-blue-500 outline-none"
                value={formData.heightFt}
                onChange={e => setFormData({...formData, heightFt: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Height (in)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-blue-500 outline-none"
                value={formData.heightIn}
                onChange={e => setFormData({...formData, heightIn: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Age</label>
            <input 
              type="number" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-blue-500 outline-none"
              value={formData.age}
              onChange={e => setFormData({...formData, age: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Goal</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-blue-500 outline-none appearance-none"
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
            <p className="text-[9px] text-center text-slate-400 mt-4 font-bold uppercase tracking-tighter">
              Updating weight automatically adjusts your macro targets and hydration goal.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}