'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function WeeklyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const unit = payload[0].name === 'calories' ? 'kcal' : 'g';
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm">
      <p className="text-zinc-400 text-xs">{label}</p>
      <p className="text-slate-100 font-medium">
        {Math.round(payload[0].value)} {unit}
      </p>
    </div>
  );
}

export default function WeeklyInsights({ dailyCalorieTarget }) {
  const [weekData, setWeekData] = useState([]);
  const [activeTab, setActiveTab] = useState('calories');

  useEffect(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const logs = storage.getLogs(dateStr);
      const calories = logs.reduce((sum, l) => sum + (l.calories || 0), 0);
      const protein = logs.reduce((sum, l) => sum + (l.protein || 0), 0);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        calories: Math.round(calories),
        protein: Math.round(protein),
      });
    }
    setWeekData(days);
  }, []);

  const isCalories = activeTab === 'calories';
  const barColor = isCalories ? '#10b981' : '#f43f5e';

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <p className="text-sm font-semibold text-slate-100 mb-4">Weekly</p>

      <div className="flex gap-2 mb-4">
        {['calories', 'protein'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? 'bg-emerald-500 text-zinc-950 text-xs font-semibold px-3 py-1 rounded-full'
                : 'bg-zinc-800 text-zinc-400 text-xs px-3 py-1 rounded-full hover:text-slate-200'
            }
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={weekData}>
          <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<WeeklyTooltip />} />
          {isCalories && dailyCalorieTarget && (
            <ReferenceLine y={dailyCalorieTarget} stroke="#a1a1aa" strokeDasharray="4 4" />
          )}
          <Bar dataKey={activeTab} fill={barColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
