'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { storage } from '@/lib/storage';
import { getProjection, movingAverage, formatShortDate, formatFullDate, lastNDates } from '@/lib/trends';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3 py-2 text-sm">
      {p.weight != null && <p className="text-emerald-400 font-semibold">{p.weight} lbs</p>}
      {p.predicted != null && p.weight == null && (
        <p className="text-emerald-400/70 font-semibold">~{p.predicted} lbs (predicted)</p>
      )}
      <p className="text-[var(--text-secondary)]">{p.label}</p>
    </div>
  );
}

export default function WeightTrendChart({ days = 30, profile, compact = false }) {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const all = storage.getWeightLogs();
    const byDate = new Map(all.map(l => [l.date, l.weight]));

    // Build one entry per calendar day in range (weight: null on days without a
    // weigh-in) so sparse weigh-ins don't collapse into a tiny sliver next to a
    // dense daily projection — Recharts spaces the axis per array entry, not
    // by real elapsed time, so entry count per side has to reflect real days.
    let points;
    if (days === 0) {
      points = movingAverage(
        all.map(l => ({ date: l.date, label: formatShortDate(l.date), weight: l.weight, predicted: null })),
        'weight'
      );
    } else {
      const calendarDates = lastNDates(days);
      points = movingAverage(
        calendarDates.map(date => ({ date, label: formatShortDate(date), weight: byDate.get(date) ?? null, predicted: null })),
        'weight'
      );
    }

    const projDays = Math.max(14, Math.min(60, days === 0 ? 60 : days));
    const projection = profile ? getProjection({ profile, daysOut: projDays }) : null;
    if (projection && points.length) {
      const projPoints = projection.points.map(p => ({
        date: p.date, label: formatShortDate(p.date), weight: null, ma: null, predicted: p.predicted,
      }));
      const anchorIdx = points.findIndex(p => p.date === projPoints[0]?.date);
      if (anchorIdx !== -1) {
        points[anchorIdx].predicted = projPoints[0].predicted;
        points = [...points.slice(0, anchorIdx + 1), ...projPoints.slice(1)];
      } else {
        // Latest weigh-in falls outside the visible range — tack the projection on after
        points = [...points, ...projPoints];
      }
    }

    setData(points);

    const lastReal = all.length ? all[all.length - 1] : null;
    if (!compact && lastReal) {
      const smoothed = points.filter(p => p.ma != null);
      const trend = smoothed.length ? smoothed[smoothed.length - 1].ma : lastReal.weight;
      const weekAgoIdx = Math.max(0, smoothed.length - 8);
      const weekDelta = smoothed.length > 1
        ? Math.round((trend - smoothed[weekAgoIdx].ma) * 10) / 10
        : null;
      setStats({
        trend,
        weekDelta,
        scale: lastReal.weight,
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
      <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Weight</p>
        <p className="text-[var(--text-tertiary)] text-sm text-center py-8">No weight data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Weight</p>
        {compact && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Trends →</span>}
      </div>

      {stats && (
        <div className="flex gap-4 mb-3">
          <div>
            <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Trend</p>
            <p className="text-lg font-black text-[var(--text-primary)]">{stats.trend}<span className="text-xs text-[var(--text-tertiary)] ml-0.5">lbs</span></p>
            <p className="text-[10px] text-[var(--text-tertiary)]">scale {stats.scale}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">This week</p>
            <p className={`text-lg font-black ${(stats.weekDelta ?? 0) <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.weekDelta == null ? '—' : `${stats.weekDelta > 0 ? '+' : ''}${stats.weekDelta}`}
              <span className="text-xs text-[var(--text-tertiary)] ml-0.5">lbs</span>
            </p>
          </div>
          <div className="flex-1 text-right">
            {stats.goalDate && stats.goal ? (
              <>
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">On pace</p>
                <p className="text-sm font-bold text-emerald-400">{stats.goal} lbs by {formatFullDate(stats.goalDate)}</p>
              </>
            ) : !stats.hasProjection ? (
              <p className="text-[10px] text-[var(--text-tertiary)] pt-3">Log more days to unlock predictions</p>
            ) : null}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={compact ? 160 : 260}>
        <ComposedChart data={data}>
          {!compact && <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />}
          <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} minTickGap={30} interval="preserveStartEnd" />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            domain={['dataMin - 2', 'dataMax + 2']}
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
