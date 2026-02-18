‘use client’;

import { useState, useEffect, useRef } from ‘react’;
import { db } from ‘@/lib/firebase’;
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from ‘firebase/firestore’;

export default function WaterTracker({ userId, date }) {
const [total, setTotal] = useState(0);
const [goal, setGoal] = useState(64);
// FIX #11: Track individual log entries so the user can undo the most recent one.
const [lastEntryId, setLastEntryId] = useState(null);
const [showUndo, setShowUndo] = useState(false);
const undoTimerRef = useRef(null);

useEffect(() => {
const unsubProfile = onSnapshot(doc(db, “users”, userId), (snap) => {
if (snap.exists() && snap.data().profile?.waterGoalOz) {
setGoal(snap.data().profile.waterGoalOz);
}
});

```
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
  if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
};
```

}, [userId, date]);

const addWater = async (amount) => {
try {
const docRef = await addDoc(collection(db, “users”, userId, “waterLogs”), {
amount,
date,
timestamp: serverTimestamp()
});
// FIX #11: Store the new entry’s ID and show an undo button for 5 seconds.
setLastEntryId(docRef.id);
setShowUndo(true);
if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
undoTimerRef.current = setTimeout(() => {
setShowUndo(false);
setLastEntryId(null);
}, 5000);
} catch (err) {
console.error(“Water log failed:”, err);
}
};

const undoLastEntry = async () => {
if (!lastEntryId) return;
try {
await deleteDoc(doc(db, “users”, userId, “waterLogs”, lastEntryId));
setShowUndo(false);
setLastEntryId(null);
if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
} catch (err) {
console.error(“Undo failed:”, err);
}
};

const progress = Math.min((total / goal) * 100, 100);

return (
<div className="bg-white p-6 rounded-[2rem] shadow-xl border border-black/5">
<div className="flex justify-between items-end mb-6">
<div>
<h3 className="text-xs font-black text-black uppercase tracking-widest mb-1">Hydration</h3>
<p className="text-3xl font-black text-black leading-none">
{total}<span className="text-sm ml-1 text-black font-bold uppercase">oz</span>
</p>
</div>
<div className="text-right">
<p className="text-[10px] font-black text-black uppercase tracking-tighter">Daily Goal: {goal}oz</p>
</div>
</div>

```
  <div className="h-5 bg-slate-100 rounded-2xl overflow-hidden mb-8 border border-black/10 shadow-inner">
    <div
      className="h-full bg-black transition-all duration-1000 ease-out relative"
      style={{ width: `${progress}%` }}
    >
      {progress > 15 && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
    </div>
  </div>

  <div className="grid grid-cols-3 gap-3">
    {[8, 16, 24].map((amount) => (
      <button
        key={amount}
        onClick={() => addWater(amount)}
        className="group flex flex-col items-center py-3 bg-slate-50 hover:bg-black hover:text-white rounded-2xl transition-all active:scale-90 border border-black/5"
      >
        <span className="text-lg mb-0.5">{amount === 8 ? '🥛' : amount === 16 ? '🥤' : '🍶'}</span>
        <span className="text-[10px] font-black text-black group-hover:text-white uppercase">{amount}oz</span>
      </button>
    ))}
  </div>

  {/* FIX #11: Undo button appears for 5 seconds after any water entry */}
  {showUndo && (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <button
        onClick={undoLastEntry}
        className="w-full py-3 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-2xl text-xs font-black text-slate-900 hover:text-red-600 uppercase tracking-widest transition-all active:scale-95"
      >
        ↩ Undo Last Entry
      </button>
    </div>
  )}
</div>
```

);
}