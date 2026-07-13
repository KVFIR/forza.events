import {useEffect} from 'react';
import type {RealtimeChannel} from '@supabase/supabase-js';
import {isSupabaseConfigured} from '../lib/supabase';
import {subscribePostgresChanges, unsubscribeChannel} from '../lib/realtime';

type PostgresChangeBinding = Parameters<typeof subscribePostgresChanges>[1][number];

/** Refetch when lobby rows change for a single event (participants + counts). */
export function useEventLiveUpdates(eventId: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!eventId || !isSupabaseConfigured()) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const channelName = `event-live:${eventId}:${crypto.randomUUID()}`;

    void (async () => {
      const ch = await subscribePostgresChanges(channelName, [
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
      if (cancelled) {
        await unsubscribeChannel(ch);
        return;
      }
      channel = ch;
    })();

    return () => {
      cancelled = true;
      void unsubscribeChannel(channel);
    };
  }, [eventId, onChange]);
}

/** Realtime filter for the signed-in viewer's roster rows (My Events catalog refresh). */
export function viewerParticipantRealtimeFilter(discordId: string): string {
  return `discord_id=eq.${discordId}`;
}

/** Patch browse feed counts; refetch when new events are published. */
export function usePublishedEventsLiveUpdates(
  includeCompleted: boolean,
  viewerDiscordId: string | undefined,
  onLobbyPatch: (row: {
    id: string;
    current_players: number;
    max_players: number;
    group_count?: number | null;
    status: string;
  }) => void,
  onCatalogChange: () => void,
) {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const channelName = `published-events:${crypto.randomUUID()}`;
    const bindings: PostgresChangeBinding[] = [
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
              : ['open'];

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
              group_count:
                newRow.group_count != null ? Number(newRow.group_count) : undefined,
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
    ];

    if (viewerDiscordId) {
      bindings.push({
        event: '*',
        table: 'event_participants',
        filter: viewerParticipantRealtimeFilter(viewerDiscordId),
        callback: () => {
          if (!cancelled) onCatalogChange();
        },
      });
    }

    void (async () => {
      const ch = await subscribePostgresChanges(channelName, bindings);
      if (cancelled) {
        await unsubscribeChannel(ch);
        return;
      }
      channel = ch;
    })();

    return () => {
      cancelled = true;
      void unsubscribeChannel(channel);
    };
  }, [includeCompleted, viewerDiscordId, onLobbyPatch, onCatalogChange]);
}
