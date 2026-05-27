import type {RealtimeChannel} from '@supabase/supabase-js';
import {getSupabase} from './supabase';

type PostgresChangeBinding = {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'events' | 'event_participants';
  filter?: string;
  callback: (payload: unknown) => void;
};

/** Drop a channel with this name if it is still registered (Strict Mode remounts). */
async function removeChannelByName(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  channelName: string,
) {
  const topic = `realtime:${channelName}`;
  const existing = supabase.getChannels().find((ch) => ch.topic === topic);
  if (existing) await supabase.removeChannel(existing);
}

export async function subscribePostgresChanges(
  channelName: string,
  bindings: PostgresChangeBinding[],
): Promise<RealtimeChannel | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  await removeChannelByName(supabase, channelName);

  let channel = supabase.channel(channelName);
  for (const binding of bindings) {
    channel = channel.on(
      'postgres_changes',
      {
        event: binding.event,
        schema: 'public',
        table: binding.table,
        filter: binding.filter,
      },
      binding.callback,
    );
  }

  channel.subscribe();
  return channel;
}

export async function unsubscribeChannel(channel: RealtimeChannel | null) {
  if (!channel) return;
  const supabase = await getSupabase();
  if (supabase) await supabase.removeChannel(channel);
}
