'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

const THRESHOLD = 80; // px of pull before a release triggers reload

export default function PullToRefresh({ children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  useEffect(() => {
    const onStart = (e) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onMove = (e) => {
      if (!pulling.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        setPull(0);
        return;
      }
      // Dampen the pull so it feels elastic
      setPull(Math.min(140, dy * 0.5));
    };

    const onEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      startY.current = null;
      setPull(p => {
        if (p >= THRESHOLD) {
          setRefreshing(true);
          window.location.reload();
          return p;
        }
        return 0;
      });
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  const armed = pull >= THRESHOLD;

  return (
    <>
      {(pull > 0 || refreshing) && (
        <div
          className="fixed left-0 right-0 flex justify-center z-[80] pointer-events-none transition-transform"
          style={{ top: `calc(env(safe-area-inset-top) + 8px)`, transform: `translateY(${Math.min(pull, 90) - 40}px)` }}
        >
          <div className={`p-2.5 rounded-full border shadow-xl ${armed || refreshing ? 'bg-[var(--accent)] border-[var(--accent-hover)]' : 'bg-[var(--surface-2)] border-[var(--border-2)]'}`}>
            <LoaderCircle
              size={18}
              className={refreshing ? 'text-zinc-950 animate-spin' : armed ? 'text-zinc-950' : 'text-[var(--text-secondary)]'}
              style={!refreshing ? { transform: `rotate(${pull * 3}deg)` } : undefined}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
      {children}
    </>
  );
}
