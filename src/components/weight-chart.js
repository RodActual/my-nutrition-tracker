'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { storage } from '@/lib/storage';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm">
      <p className="text-slate-100 font-medium">{payload[0].value} lbs</p>
      <p className="text-zinc-400">{payload[0].payload.label}</p>
    </div>
  );
}

export default function WeightChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const logs = storage.getWeightLogs()
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    setData(logs.map(l => ({ ...l, label: formatDate(l.date) })));
  }, []);

  if (!data.length) return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <p className="text-zinc-500 text-sm text-center py-8">No weight data yet</p>
    </div>
  );

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <p className="text-sm font-semibold text-slate-100 mb-4">Weight</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} domain={([min, max]) => min === max ? [min - 5, max + 5] : ['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
