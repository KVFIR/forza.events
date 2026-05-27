import {useMemo} from 'react';
import {resolveEventDisplayStatus} from '../lib/eventSpec';
import type {EventStatus, ForzaEvent} from '../lib/types';
import {useEventTimeTick} from './useEventTimeTick';

type EventDisplaySlice = Pick<
  ForzaEvent,
  'status' | 'lifecycle' | 'startsAt' | 'currentPlayers' | 'maxPlayers'
>;

export function useResolveEventDisplayStatus(event: EventDisplaySlice | undefined): EventStatus {
  const tick = useEventTimeTick(event?.startsAt ?? '', [event?.status, event?.lifecycle]);
  return useMemo(
    () => (event ? resolveEventDisplayStatus(event) : 'open'),
    [event, tick],
  );
}
