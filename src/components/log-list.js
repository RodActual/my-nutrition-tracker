'use client';

import { Pencil, Trash2 } from 'lucide-react';

function getMealLabel(timestamp) {
  if (!timestamp) return 'Snacks';
  const hour = new Date(timestamp).getHours();
  if (hour < 10) return 'Breakfast';
  if (hour < 14) return 'Lunch';
  if (hour < 18) return 'Dinner';
  return 'Snacks';
}

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function LogList({ logs, onDelete = () => {}, onEdit = () => {} }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">No food logged yet</div>
    );
  }

  const grouped = {};
  for (const log of logs) {
    const label = getMealLabel(log.timestamp);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(log);
  }

  return (
    <div>
      {MEAL_ORDER.filter((meal) => grouped[meal]).map((meal) => (
        <div key={meal} className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            {meal}
          </p>
          {grouped[meal].map((log) => (
            <div
              key={log.id ?? log.timestamp}
              className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 mb-2 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100 truncate">{log.name ?? 'Unknown food'}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {log.calories ?? 0} kcal &bull; {Math.round(log.protein ?? 0)}g protein &bull; {Math.round(log.carbs ?? 0)}g carbs &bull; {Math.round(log.fat ?? 0)}g fat
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(log)}
                  aria-label={`Edit ${log.name}`}
                  className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(log.id)}
                  aria-label={`Delete ${log.name}`}
                  className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
