'use client';

export default function LogList({ logs, onDelete, onEdit }) {
if (logs.length === 0) return null;

return (
<div className="space-y-4 animate-in slide-in-from-bottom duration-500 delay-150">
<div className="flex items-center gap-4">
<div className="h-px flex-1 bg-slate-200"></div>
<span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Today's Food</span>
<div className="h-px flex-1 bg-slate-200"></div>
</div>

```
  <div className="space-y-3">
    {logs.map((log) => (
      <div
        key={log.id}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 flex items-stretch overflow-hidden"
      >
        {/* Edit zone — left portion of the row */}
        <button
          onClick={() => onEdit(log)}
          className="flex-1 p-4 text-left active:bg-blue-50 transition-colors min-w-0"
        >
          <p className="font-bold text-black text-sm truncate">{log.name}</p>
          <p className="text-xs text-slate-900 mt-0.5">
            {log.calories} kcal • {log.protein}g protein
          </p>
        </button>

        {/* Delete zone — fully isolated right button with generous touch target */}
        <button
          onClick={() => onDelete(log.id)}
          aria-label={`Delete ${log.name}`}
          className="flex items-center justify-center w-14 shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors border-l border-slate-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    ))}
  </div>
</div>
```

);
}