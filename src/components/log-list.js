'use client';

import { Pencil, Trash2, Copy, Sunrise, Sun, Sunset, Cookie } from 'lucide-react';

function getMealLabel(timestamp) {
  if (!timestamp) return 'Snacks';
  const hour = new Date(timestamp).getHours();
  if (hour < 10) return 'Breakfast';
  if (hour < 14) return 'Lunch';
  if (hour < 18) return 'Dinner';
  return 'Snacks';
}

function formatTime(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  if (isNaN(d)) return null;
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const MEALS = {
  Breakfast: { icon: Sunrise, color: 'text-amber-400' },
  Lunch: { icon: Sun, color: 'text-yellow-400' },
  Dinner: { icon: Sunset, color: 'text-orange-400' },
  Snacks: { icon: Cookie, color: 'text-purple-400' },
};

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function LogList({ logs, onDelete = () => {}, onEdit = () => {}, onCopyMeal, onCopyYesterday }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">
        <p>No food logged yet</p>
        {onCopyYesterday && (
          <button
            type="button"
            onClick={onCopyYesterday}
            className="mt-3 inline-flex items-center gap-2 bg-[var(--surface-2)] hover:bg-[var(--border-2)] border border-[var(--border-2)] text-[var(--accent)] text-xs font-semibold rounded-xl px-4 py-2 transition-colors"
          >
            <Copy size={13} aria-hidden="true" /> Copy yesterday&apos;s log
          </button>
        )}
      </div>
    );
  }

  const grouped = {};
  for (const log of logs) {
    const label = getMealLabel(log.timestamp);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(log);
  }
  // Chronological within each meal
  for (const meal of Object.keys(grouped)) {
    grouped[meal].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  }

  return (
    <div>
      {MEAL_ORDER.filter((meal) => grouped[meal]).map((meal) => {
        const { icon: Icon, color } = MEALS[meal];
        const mealCals = Math.round(grouped[meal].reduce((s, l) => s + (l.calories || 0), 0));
        return (
          <div key={meal} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Icon size={13} className={color} aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{meal}</p>
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] ml-1">{mealCals} kcal</span>
              </div>
              {onCopyMeal && (
                <button
                  type="button"
                  onClick={() => onCopyMeal(grouped[meal])}
                  aria-label={`Copy ${meal} to today`}
                  className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                >
                  <Copy size={12} aria-hidden="true" /> Copy to today
                </button>
              )}
            </div>
            {grouped[meal].map((log) => {
              const time = formatTime(log.timestamp);
              return (
                <div
                  key={log.id ?? log.timestamp}
                  className="bg-[var(--surface)] rounded-xl border border-[var(--border)] px-4 py-3 mb-2 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{log.name ?? 'Unknown food'}</p>
                      {time && <span className="text-[10px] text-[var(--text-tertiary)] font-semibold shrink-0">{time}</span>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {log.calories ?? 0} kcal &bull; {Math.round(log.protein ?? 0)}g protein &bull; {Math.round(log.carbs ?? 0)}g carbs &bull; {Math.round(log.fats ?? log.fat ?? 0)}g fat
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(log)}
                      aria-label={`Edit ${log.name}`}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(log.id)}
                      aria-label={`Delete ${log.name}`}
                      className="p-1 text-[var(--text-secondary)] hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
