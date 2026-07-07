'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { storage } from '@/lib/storage';
import { lastNDates, formatShortDate } from '@/lib/trends';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm">
      <p className="text-sky-400 font-semibold">{p.oz} oz</p>
      <p className="text-zinc-400">{p.label}</p>
    </div>
  );
}

export default function WaterChart({ days = 30, waterGoal }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const all = storage.getWaterLogs();
    const byDate = {};
    for (const w of all) {
      byDate[w.date] = (byDate[w.date] ?? 0) + (w.amount || 0);
    }
    const rows = lastNDates(days || 90)
      .map(date => ({ date, label: formatShortDate(date), oz: byDate[date] ?? 0 }))
      .filter(d => d.oz > 0);
    setData(rows);
  }, [days]);

  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-slate-100 mb-2">Water</p>
        <p className="text-zinc-500 text-sm text-center py-8">No water logged in range</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <p className="text-sm font-semibold text-slate-100 mb-3">Water</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} width={30} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a' }} />
          {waterGoal ? <ReferenceLine y={Number(waterGoal)} stroke="#38bdf8" strokeDasharray="4 4" /> : null}
          <Bar dataKey="oz" fill="#38bdf8" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
