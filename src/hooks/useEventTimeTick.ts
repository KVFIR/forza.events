import {useEffect, useMemo, useState} from 'react';
import type {ForzaEvent} from '../lib/types';

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

/** One timer for the nearest future `startsAt` in a catalog — re-run filters without N timeouts. */
export function useUpcomingEventsTick(events: Pick<ForzaEvent, 'startsAt'>[]): number {
  const [tick, setTick] = useState(0);
  const startsAtKey = useMemo(
    () => events.map((event) => event.startsAt).join('\0'),
    [events],
  );

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const now = Date.now();
    let nearest = Infinity;
    for (const part of startsAtKey.split('\0')) {
      if (!part) continue;
      const target = new Date(part).getTime();
      if (!Number.isNaN(target) && target > now) nearest = Math.min(nearest, target);
    }
    if (nearest === Infinity) return;

    const delay = nearest - Date.now();
    if (delay <= 0) {
      bump();
      return;
    }

    const timer = window.setTimeout(bump, Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [startsAtKey, tick]);

  return tick;
}
