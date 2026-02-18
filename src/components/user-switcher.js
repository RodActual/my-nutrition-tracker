'use client';

export default function UserSwitcher({ onSelect }) {
  const users = [
    { id: 'anthony_uid', name: 'Anthony' },
    { id: 'madison_uid', name: 'Madison' }
  ];

  // FIX: Removed the redundant localStorage.setItem call. The parent component
  // (page.js handleSelect) already writes to localStorage, so doing it here too
  // resulted in two writes per selection with no benefit.
  const handleSelect = (userId) => {
    onSelect(userId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <h1 className="text-3xl font-black mb-8 text-black uppercase tracking-tight">
        Who is tracking today?
      </h1>
      <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => handleSelect(user.id)}
            className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 text-xl font-black text-black hover:bg-blue-600 hover:text-white transition-all active:scale-95 border-2 border-transparent"
          >
            {user.name}
          </button>
        ))}
      </div>
    </div>
  );
}