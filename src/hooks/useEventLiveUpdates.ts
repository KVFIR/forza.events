import {useEffect} from 'react';
import type {RealtimeChannel} from '@supabase/supabase-js';
import {isSupabaseConfigured} from '../lib/supabase';
import {subscribePostgresChanges, unsubscribeChannel} from '../lib/realtime';

/** Refetch when lobby rows change for a single event (participants + counts). */
export function useEventLiveUpdates(eventId: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!eventId || !isSupabaseConfigured()) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void (async () => {
      channel = await subscribePostgresChanges(`event-live:${eventId}`, [
        {
          event: '*',
          table: 'event_participants',
          filter: `event_id=eq.${eventId}`,
          callback: () => {
            if (!cancelled) onChange();
          },
        },
        {
          event: 'UPDATE',
          table: 'events',
          filter: `id=eq.${eventId}`,
          callback: () => {
            if (!cancelled) onChange();
          },
        },
      ]);
    })();

    return () => {
      cancelled = true;
      void unsubscribeChannel(channel);
    };
  }, [eventId, onChange]);
}

/** Patch browse feed counts; refetch when new events are published. */
export function usePublishedEventsLiveUpdates(
  includeCompleted: boolean,
  onLobbyPatch: (row: {
    id: string;
    current_players: number;
    max_players: number;
    status: string;
  }) => void,
  onCatalogChange: () => void,
) {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void (async () => {
      channel = await subscribePostgresChanges('published-events', [
        {
          event: 'UPDATE',
          table: 'events',
          callback: (payload: unknown) => {
            if (cancelled) return;
            const {old: oldRow, new: newRow} = payload as {
              old: Record<string, unknown> | null;
              new: Record<string, unknown>;
            };
            if (typeof newRow.id !== 'string' || newRow.status === 'draft') return;

            const oldStatus = String(oldRow?.status ?? '');
            const newStatus = String(newRow.status);
            const browseStatuses = includeCompleted
              ? ['open', 'checkin', 'live', 'completed', 'cancelled', 'archived']
              : ['open', 'checkin', 'live'];

            const wasBrowsable = browseStatuses.includes(oldStatus);
            const isBrowsable = browseStatuses.includes(newStatus);

            // Publish (draft → open) or any browse membership change → refetch list.
            if (oldStatus === 'draft' || wasBrowsable !== isBrowsable) {
              onCatalogChange();
              return;
            }

            onLobbyPatch({
              id: newRow.id,
              current_players: Number(newRow.current_players),
              max_players: Number(newRow.max_players),
              status: newStatus,
            });
          },
        },
        {
          event: 'INSERT',
          table: 'events',
          callback: (payload: unknown) => {
            if (cancelled) return;
            const row = (payload as {new: Record<string, unknown>}).new;
            if (row.status === 'draft') return;
            onCatalogChange();
          },
        },
        {
          event: 'DELETE',
          table: 'events',
          callback: () => {
            if (!cancelled) onCatalogChange();
          },
        },
      ]);
    })();

    return () => {
      cancelled = true;
      void unsubscribeChannel(channel);
    };
  }, [includeCompleted, onLobbyPatch, onCatalogChange]);
}
