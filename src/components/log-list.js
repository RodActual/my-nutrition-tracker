'use client';

export default function LogList({ logs, onDelete, onEdit }) {
  if (logs.length === 0) return null;

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom duration-500 delay-150">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200"></div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Todays Food</span>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div 
            key={log.id} 
            onClick={() => onEdit(log)} // Tap row to edit
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group active:scale-[0.98] transition-all cursor-pointer"
          >
            <div>
              <p className="font-bold text-slate-800 text-sm">{log.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {log.calories} kcal • {log.protein}g protein
              </p>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevents clicking "Edit" while trying to delete
                onDelete(log.id);
              }}
              className="text-slate-300 hover:text-red-500 p-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}