'use client';

export default function CalorieRing({ current, target }) {
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min((current / (target || 1)) * 100, 100);
  const offset = circumference - (pct / 100) * circumference;
  const over = current > (target || 0);
  const remaining = Math.max((target || 0) - current, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--border-2)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={over ? '#f87171' : 'var(--accent)'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-[var(--text-primary)] leading-none">{current.toLocaleString()}</span>
          <span className="text-xs text-[var(--text-tertiary)] mt-1">of {(target || 0).toLocaleString()} kcal</span>
          <span className={`text-xs font-bold mt-1 ${over ? 'text-red-400' : 'text-[var(--accent)]'}`}>
            {over ? `+${(current - target).toLocaleString()} over` : `${remaining.toLocaleString()} left`}
          </span>
        </div>
      </div>
    </div>
  );
}
