'use client';
import { useState, useEffect } from 'react';
import { appDayKey } from './day';

// Milliseconds until the next 5 AM local boundary.
function msUntilNextBoundary(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(5, 0, 0, 0);
  if (now.getHours() >= 5) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

// Returns the current logical-day key and re-renders the moment it rolls
// over at 5 AM — so a screen left open through the night resets on its own.
export function useAppDay(): string {
  const [day, setDay] = useState(() => appDayKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setDay(appDayKey());
        schedule();
      }, msUntilNextBoundary() + 1000); // small cushion past 05:00:00
    };
    schedule();

    // Also re-check when the tab regains focus (covers device sleep/wake).
    const onVisible = () => { if (!document.hidden) setDay(appDayKey()); };
    document.addEventListener('visibilitychange', onVisible);

    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  return day;
}
