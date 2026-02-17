'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';

export default function WaterTracker({ userId, date }) {
  const [total, setTotal] = useState(0);
  const [goal, setGoal] = useState(64); // Default fallback

  useEffect(() => {
    // 1. Fetch the goal from user profile
    const unsubProfile = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists() && snap.data().profile?.waterGoalOz) {
        setGoal(snap.data().profile.waterGoalOz);
      }
    });

    // 2. Fetch daily logs
    const waterRef = collection(db, "users", userId, "waterLogs");
    const q = query(waterRef, where("date", "==", date));

    const unsubWater = onSnapshot(q, (snapshot) => {
      let dailyTotal = 0;
      snapshot.forEach((doc) => {
        dailyTotal += doc.data().amount || 0;
      });
      setTotal(dailyTotal);
    });

    return () => {
      unsubProfile();
      unsubWater();
    };
  }, [userId, date]);

  const addWater = async (amount) => {
    try {
      await addDoc(collection(db, "users", userId, "waterLogs"), {
        amount,
        date,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Water log failed:", err);
    }
  };

  const progress = Math.min((total / goal) * 100, 100);

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-blue-100/50 border border-blue-50">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Hydration</h3>
          <p className="text-3xl font-black text-blue-600 leading-none">{total}<span className="text-sm ml-1 text-blue-300 font-bold uppercase">oz</span></p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Daily Goal: {goal}oz</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-5 bg-blue-50 rounded-2xl overflow-hidden mb-8 border border-blue-100/20 shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000 ease-out relative"
          style={{ width: `${progress}%` }}
        >
            {progress > 15 && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
        </div>
      </div>

      {/* Quick Add Buttons in Oz */}
      <div className="grid grid-cols-3 gap-3">
        {[8, 16, 24].map((amount) => (
          <button
            key={amount}
            onClick={() => addWater(amount)}
            className="group flex flex-col items-center py-3 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-90"
          >
            <span className="text-lg mb-0.5">{amount === 8 ? '🥛' : amount === 16 ? '🥤' : '🍶'}</span>
            <span className="text-[10px] font-black uppercase">{amount}oz</span>
          </button>
        ))}
      </div>
    </div>
  );
}