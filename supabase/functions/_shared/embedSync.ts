import {botHeaders} from './discord.ts';
import {buildEventEmbed} from './events.ts';

type PublishedEvent = {
  id: string;
  channel_id: string | null;
  discord_message_id: string | null;
} & Parameters<typeof buildEventEmbed>[0];

export async function syncPublishedEmbed(event: PublishedEvent): Promise<void> {
  if (!event.channel_id || !event.discord_message_id) return;

  const payload = buildEventEmbed(event);
  const res = await fetch(
    `https://discord.com/api/channels/${event.channel_id}/messages/${event.discord_message_id}`,
    {
      method: 'PATCH',
      headers: botHeaders(),
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('Discord embed sync failed', text);
  }
}
