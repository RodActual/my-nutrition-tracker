'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function WeightChart({ userId }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const weightRef = collection(db, "users", userId, "weightLogs");
    const q = query(weightRef, orderBy("date", "asc"), limit(30));

    const unsub = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        date: new Date(doc.data().date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: doc.data().weight
      }));
      setData(logs);
    });

    return () => unsub();
  }, [userId]);

  if (data.length < 2) return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center py-12">
      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Add more weight entries to see progress</p>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-50">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Weight Trend (LBS)</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
              dy={10}
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']} 
              hide 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
            />
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="#2563eb" 
              strokeWidth={4} 
              dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
              activeDot={{ r: 8, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}