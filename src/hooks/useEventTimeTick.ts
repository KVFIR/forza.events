import {useEffect, useState} from 'react';

/** Bump when `startsAt` is reached so UI can refresh derived live/ended state without refetch. */
export function useEventTimeTick(startsAt: string, resetDeps: unknown[] = []): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const target = new Date(startsAt).getTime();
    if (Number.isNaN(target)) return;

    const bump = () => setTick((n) => n + 1);

    if (Date.now() >= target) {
      bump();
      return;
    }

    const delay = Math.min(target - Date.now(), 2_147_483_647);
    const timer = window.setTimeout(bump, delay);
    return () => window.clearTimeout(timer);
    // resetDeps lets callers re-schedule when status/lifecycle changes (e.g. cancel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsAt, ...resetDeps]);

  return tick;
}
