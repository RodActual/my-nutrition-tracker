'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/dashboard';

export default function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Dashboard />;
}
