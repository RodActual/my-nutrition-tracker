'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
// Assuming these helpers exist in your lib folder
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

    try {
      const weightLbs = parseFloat(formData.weight);
      const weightKg = lbsToKg(weightLbs);
      const heightCm = ftInToCm(parseInt(formData.heightFt), parseInt(formData.heightIn));
      
      // Calculate new calorie/macro targets
      const newTargets = calculateTargets(
        weightKg, 
        heightCm, 
        parseInt(formData.age), 
        formData.gender, 
        formData.activityLevel, 
        formData.goal
      );

      // Hydration Goal: 0.6oz per lb
      const waterGoalOz = Math.round(weightLbs * 0.6);

      // CRITICAL: Update the user document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        profile: {
          ...formData,
          weightKg,
          heightCm,
          waterGoalOz,
          lastUpdated: new Date().toISOString()
        },
        targets: newTargets
      });

      // Log the weight for the charts
      await addDoc(collection(db, "users", userId, "weightLogs"), {
        weight: weightLbs,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      });

      onClose();
    } catch (err) {
      console.error("Settings Update Failed:", err);
      alert("Error saving settings. Please ensure all fields are filled out.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-black uppercase tracking-tight">Profile Settings</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-black">✕</button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Weight (lbs)</label>
              <input 
                type="number" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black outline-none focus:border-black"
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Age</label>
              <input 
                type="number" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black outline-none focus:border-black"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Height</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Ft"
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black outline-none focus:border-black"
                value={formData.heightFt}
                onChange={e => setFormData({...formData, heightFt: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="In"
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black outline-none focus:border-black"
                value={formData.heightIn}
                onChange={e => setFormData({...formData, heightIn: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Weekly Goal</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black outline-none appearance-none focus:border-black"
              value={formData.goal}
              onChange={e => setFormData({...formData, goal: e.target.value})}
            >
              <option value="lose">Weight Loss</option>
              <option value="maintain">Maintenance</option>
              <option value="gain">Muscle Gain</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-black py-5 rounded-3xl text-white font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
