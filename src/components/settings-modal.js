'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { calculateTargets, lbsToKg, ftInToCm } from '@/lib/nutrition';

export default function SettingsModal({ userId, currentProfile, onClose }) {
  // Ensure every single field has a hardcoded fallback to prevent "undefined" errors
  const [formData, setFormData] = useState({
    weight: currentProfile?.weight || '',
    heightFt: currentProfile?.heightFt || '',
    heightIn: currentProfile?.heightIn || '',
    age: currentProfile?.age || '',
    goal: currentProfile?.goal || 'maintain',
    gender: currentProfile?.gender || 'female', // Default to female for Madison
    activityLevel: currentProfile?.activityLevel || 1.2
  });
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Validation check for all numbers
      const weightLbs = parseFloat(formData.weight);
      const age = parseInt(formData.age);
      const hFt = parseInt(formData.heightFt);
      const hIn = parseInt(formData.heightIn);

      if (!weightLbs || !age || isNaN(hFt)) {
        throw new Error("Missing numeric fields");
      }

      const weightKg = lbsToKg(weightLbs);
      const heightCm = ftInToCm(hFt, hIn);
      
      // 2. Calculation (This is where it usually fails if a field is missing)
      const newTargets = calculateTargets(
        weightKg, 
        heightCm, 
        age, 
        formData.gender, 
        parseFloat(formData.activityLevel), 
        formData.goal
      );

      const waterGoalOz = Math.round(weightLbs * 0.6);

      // 3. Firestore Update
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

      // 4. Weight Tracking Log
      await addDoc(collection(db, "users", userId, "weightLogs"), {
        weight: weightLbs,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      });

      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      alert("Please check all fields. Make sure Age, Weight, and Height are numbers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-black uppercase tracking-tight">Settings</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-black">✕</button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          {/* Gender Selection - Often the missing field */}
          <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl">
            {['male', 'female'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setFormData({...formData, gender: g})}
                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${
                  formData.gender === g ? 'bg-black text-white' : 'text-black opacity-40'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-black uppercase mb-1 ml-1">Weight (lbs)</label>
              <input type="number" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-black uppercase mb-1 ml-1">Age</label>
              <input type="number" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-1 ml-1">Height</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Ft" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black" value={formData.heightFt} onChange={e => setFormData({...formData, heightFt: e.target.value})} />
              <input type="number" placeholder="In" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black" value={formData.heightIn} onChange={e => setFormData({...formData, heightIn: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-1 ml-1">Activity Level</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black outline-none"
              value={formData.activityLevel}
              onChange={e => setFormData({...formData, activityLevel: e.target.value})}
            >
              <option value={1.2}>Sedentary (Office job)</option>
              <option value={1.375}>Lightly Active (1-2 days/week)</option>
              <option value={1.55}>Moderately Active (3-5 days/week)</option>
              <option value={1.725}>Very Active (6-7 days/week)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-1 ml-1">Goal</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-black outline-none"
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
            className="w-full bg-black py-5 rounded-3xl text-white font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
