'use client';

import CalorieRing from './calorie-ring';

function MacroBar({ label, current, target, color }) {
  const pct = Math.min((current / (target || 1)) * 100, 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-bold text-[var(--text-secondary)]">
          {Math.round(current)}<span className="text-[var(--text-tertiary)]">/{target}g</span>
        </span>
      </div>
      <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DailyProgress({ targets, current }) {
  return (
    <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-6">
      <div className="flex justify-center mb-6">
        <CalorieRing current={Math.round(current.calories)} target={targets.calories} />
      </div>
      <div className="space-y-3">
        <MacroBar label="Protein" current={current.protein} target={targets.protein} color="bg-rose-500" />
        <MacroBar label="Carbs" current={current.carbs} target={targets.carbs} color="bg-emerald-500" />
        <MacroBar label="Fats" current={current.fats} target={targets.fat ?? targets.fats} color="bg-amber-400" />
      </div>
    </div>
  );
}
