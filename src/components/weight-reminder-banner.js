'use client';

export default function WeightReminderBanner({ lastUpdated, onOpenSettings }) {
if (!lastUpdated) return null;

const lastDate = new Date(lastUpdated);
const today = new Date();

const diffTime = Math.abs(today - lastDate);
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

if (diffDays <= 7) return null;

return (
<div className="bg-amber-50 border-b border-amber-100 p-4 animate-in fade-in slide-in-from-top duration-500">
<div className="max-w-md mx-auto flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="text-2xl">⚖️</span>
<div>
<p className="text-sm font-bold text-amber-900">Time to check-in!</p>
<p className="text-xs text-amber-700">It's been {diffDays} days since your last weigh-in.</p>
</div>
</div>
<button
onClick={onOpenSettings}
className="bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg active:scale-95 transition shadow-sm"
>
Update
</button>
</div>
</div>
);
}