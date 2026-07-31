'use client';

import { useState } from 'react';
import { Cloud, LoaderCircle } from 'lucide-react';
import { setSyncCode, pullRemoteData, pushAllData } from '@/lib/storage';

export default function SyncLogin({ onDone }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError('Sync code must be at least 6 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    setSyncCode(code.trim());
    const result = await pullRemoteData();
    if (result === 'empty' || result === 'local-newer') {
      // New code, or this device has the freshest data — seed the cloud
      await pushAllData().catch(() => {});
    }
    setBusy(false);
    onDone();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 rounded-3xl border border-zinc-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Cloud size={20} className="text-emerald-400" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-black text-slate-100">Sync Code</h1>
        </div>
        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          Pick a private code (like a password) to back up your data and use it on any device.
          Enter the same code elsewhere to load your data there. Don&apos;t lose it — there is no reset.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="At least 6 characters"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold rounded-2xl py-3 flex items-center justify-center gap-2"
          >
            {busy && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
            {busy ? 'Syncing…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
