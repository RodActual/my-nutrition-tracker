'use client';

import { useEffect, useRef } from 'react';

export default function NutritionInsights({ foodName, insights, onDismiss }) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!insights?.length) return null;

  return (
    <div className="fixed bottom-28 left-4 right-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-700/60">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nutrition Insight</p>
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xs leading-none p-1"
          >
            ✕
          </button>
        </div>
        <p className="text-white font-black text-sm mb-3 truncate">{foodName}</p>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-2xl ${
                insight.type === 'warn'
                  ? 'bg-orange-950/50 border border-orange-700/30'
                  : 'bg-emerald-950/50 border border-emerald-700/30'
              }`}
            >
              <span className="text-sm shrink-0 mt-0.5">{insight.icon}</span>
              <p className={`text-xs font-semibold leading-snug ${
                insight.type === 'warn' ? 'text-orange-300' : 'text-emerald-300'
              }`}>
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
