import {useMemo} from 'react';
import {resolveEventDisplayStatus} from '../lib/eventSpec';
import type {EventStatus, ForzaEvent} from '../lib/types';
import {useEventTimeTick} from './useEventTimeTick';

export function useResolveEventDisplayStatus(
  event: Pick<ForzaEvent, 'status' | 'lifecycle' | 'startsAt' | 'currentPlayers' | 'maxPlayers'>,
): EventStatus {
  const tick = useEventTimeTick(event.startsAt, [event.status, event.lifecycle]);
  return useMemo(
    () => resolveEventDisplayStatus(event),
    [event, tick],
  );
}
