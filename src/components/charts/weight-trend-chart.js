'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { storage } from '@/lib/storage';
import { getProjection, movingAverage, formatShortDate, lastNDates } from '@/lib/trends';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm">
      {p.weight != null && <p className="text-emerald-400 font-semibold">{p.weight} lbs</p>}
      {p.predicted != null && p.weight == null && (
        <p className="text-emerald-400/70 font-semibold">~{p.predicted} lbs (predicted)</p>
      )}
      <p className="text-zinc-400">{p.label}</p>
    </div>
  );
}

export default function WeightTrendChart({ days = 30, profile, compact = false }) {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const all = storage.getWeightLogs();
    const inRange = days === 0
      ? all
      : all.filter(l => lastNDates(days).includes(l.date));

    let points = movingAverage(
      inRange.map(l => ({ date: l.date, label: formatShortDate(l.date), weight: l.weight, predicted: null })),
      'weight'
    );

    const projection = profile ? getProjection({ profile }) : null;
    if (projection && inRange.length) {
      const projPoints = projection.points.map(p => ({
        date: p.date, label: formatShortDate(p.date), weight: null, ma: null, predicted: p.predicted,
      }));
      // Anchor: first projection point overlaps latest weigh-in
      if (projPoints.length) projPoints[0].weight = inRange[inRange.length - 1].weight;
      points = [...points, ...projPoints.slice(1)];
      if (projPoints.length) points[inRange.length - 1].predicted = projPoints[0].predicted;
    }

    setData(points);

    if (!compact && inRange.length) {
      const smoothed = points.filter(p => p.ma != null);
      const trend = smoothed.length ? smoothed[smoothed.length - 1].ma : inRange[inRange.length - 1].weight;
      const weekAgoIdx = Math.max(0, smoothed.length - 8);
      const weekDelta = smoothed.length > 1
        ? Math.round((trend - smoothed[weekAgoIdx].ma) * 10) / 10
        : null;
      setStats({
        trend,
        weekDelta,
        scale: inRange[inRange.length - 1].weight,
        goal: Number(profile?.goalWeight) || null,
        goalDate: projection?.goalDate ?? null,
        hasProjection: !!projection,
      });
    } else {
      setStats(null);
    }
  }, [days, profile, compact]);

  if (!data.length) {
    return (
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
        <p className="text-sm font-semibold text-slate-100 mb-2">Weight</p>
        <p className="text-zinc-500 text-sm text-center py-8">No weight data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-sm font-semibold text-slate-100">Weight</p>
        {compact && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Trends →</span>}
      </div>

      {stats && (
        <div className="flex gap-4 mb-3">
          <div>
            <p className="text-[9px] font-bold text-zinc-500 uppercase">Trend</p>
            <p className="text-lg font-black text-slate-100">{stats.trend}<span className="text-xs text-zinc-500 ml-0.5">lbs</span></p>
            <p className="text-[10px] text-zinc-500">scale {stats.scale}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-zinc-500 uppercase">This week</p>
            <p className={`text-lg font-black ${(stats.weekDelta ?? 0) <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.weekDelta == null ? '—' : `${stats.weekDelta > 0 ? '+' : ''}${stats.weekDelta}`}
              <span className="text-xs text-zinc-500 ml-0.5">lbs</span>
            </p>
          </div>
          <div className="flex-1 text-right">
            {stats.goalDate && stats.goal ? (
              <>
                <p className="text-[9px] font-bold text-zinc-500 uppercase">On pace</p>
                <p className="text-sm font-bold text-emerald-400">{stats.goal} lbs by {formatShortDate(stats.goalDate)}</p>
              </>
            ) : !stats.hasProjection ? (
              <p className="text-[10px] text-zinc-500 pt-3">Log more days to unlock predictions</p>
            ) : null}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={compact ? 160 : 260}>
        <ComposedChart data={data}>
          {!compact && <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />}
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            domain={([min, max]) => (min === max ? [min - 5, max + 5] : ['auto', 'auto'])}
            width={35}
          />
          <Tooltip content={<ChartTooltip />} />
          {stats?.goal && <ReferenceLine y={stats.goal} stroke="#f59e0b" strokeDasharray="4 4" />}
          <Line type="monotone" dataKey="ma" stroke="#71717a" strokeWidth={1} dot={false} connectNulls />
          <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2}
            dot={{ r: 2.5, fill: '#10b981' }} activeDot={{ r: 4, fill: '#10b981' }} connectNulls />
          <Line type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={2}
            strokeDasharray="5 5" strokeOpacity={0.6} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
