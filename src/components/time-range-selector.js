'use client';

const RANGES = [
  { id: 7, label: '7D' },
  { id: 30, label: '30D' },
  { id: 90, label: '90D' },
  { id: 0, label: 'All' },
];

export default function TimeRangeSelector({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-1">
      {RANGES.map(r => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            value === r.id ? 'bg-[var(--accent)] text-zinc-950' : 'text-[var(--text-secondary)]'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
