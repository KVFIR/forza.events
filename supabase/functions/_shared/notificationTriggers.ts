import {enqueueNotifications, type OutboxInsert} from './notifications.ts';
import type {adminClient} from './supabase.ts';

export function formatStartsAtForNotify(
  startsAt: string,
  timezone: string | null | undefined,
  locale: string | null | undefined,
): string {
  const tz = timezone?.trim() || 'UTC';
  const lng = locale === 'ru' ? 'ru-RU' : 'en-US';
  try {
    return new Intl.DateTimeFormat(lng, {
      timeZone: tz,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(startsAt));
  } catch {
    return new Intl.DateTimeFormat(lng, {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(startsAt));
  }
}

type ParticipantRow = {
  discord_id: string;
  group_index: number | null;
  waitlisted: boolean | null;
  is_convoy_leader: boolean | null;
  gamertag_snapshot: string | null;
};

type EventNotifyRow = {
  id: string;
  title: string;
  host_discord_id: string;
  max_players: number;
  group_count: number | null;
  starts_at: string;
  timezone?: string | null;
};

function activeRacers(rows: ParticipantRow[]): ParticipantRow[] {
  return rows.filter((r) => !r.waitlisted);
}

function groupRacers(rows: ParticipantRow[], groupIndex: number): ParticipantRow[] {
  return activeRacers(rows).filter((r) => (r.group_index ?? 1) === groupIndex);
}

function leaderGamertag(rows: ParticipantRow[], groupIndex: number): string {
  const leader = groupRacers(rows, groupIndex).find((r) => r.is_convoy_leader);
  return leader?.gamertag_snapshot?.trim() || 'TBD';
}

export async function enqueueEventCancelled(
  supabase: ReturnType<typeof adminClient>,
  event: EventNotifyRow,
  participants: ParticipantRow[],
): Promise<void> {
  const rows: OutboxInsert[] = participants
    .filter((p) => p.discord_id !== event.host_discord_id)
    .map((p) => ({
    kind: 'event_cancelled',
    event_id: event.id,
    recipient_discord_id: p.discord_id,
    dedupe_key: `cancel:${event.id}:${p.discord_id}`,
    payload: {eventTitle: event.title},
  }));
  await enqueueNotifications(supabase, rows);
}

export async function enqueueConvoyLeaderChanged(
  supabase: ReturnType<typeof adminClient>,
  event: EventNotifyRow,
  participants: ParticipantRow[],
  groupIndex: number,
  leaderGamertag: string,
  leaderHandle?: string | null,
): Promise<void> {
  const recipients = groupRacers(participants, groupIndex).filter((r) => !r.is_convoy_leader);
  const rows: OutboxInsert[] = recipients.map((p) => ({
    kind: 'convoy_leader_changed',
    event_id: event.id,
    recipient_discord_id: p.discord_id,
    dedupe_key: `leader:${event.id}:${groupIndex}:${leaderGamertag}:${p.discord_id}`,
    payload: {
      eventTitle: event.title,
      groupIndex,
      leaderGamertag,
      leaderHandle: leaderHandle ?? '',
    },
  }));
  await enqueueNotifications(supabase, rows);
}

export async function enqueueWaitlistSeatOpened(
  supabase: ReturnType<typeof adminClient>,
  event: EventNotifyRow,
  promotedDiscordId: string,
  groupIndex: number,
  participants: ParticipantRow[],
): Promise<void> {
  await enqueueNotifications(supabase, [{
    kind: 'waitlist_seat_opened',
    event_id: event.id,
    recipient_discord_id: promotedDiscordId,
    dedupe_key: `seat:${event.id}:${promotedDiscordId}`,
    payload: {
      eventTitle: event.title,
      groupIndex,
      leaderGamertag: leaderGamertag(participants, groupIndex),
    },
  }]);
}

export async function enqueueWaitlistNewGroup(
  supabase: ReturnType<typeof adminClient>,
  event: EventNotifyRow,
  groupIndex: number,
  promotedIds: string[],
  leaderFromWaitlist: boolean,
  leaderDiscordId: string,
  participants: ParticipantRow[],
): Promise<void> {
  const leaderGt = leaderGamertag(participants, groupIndex);
  const rows: OutboxInsert[] = [];

  for (const id of promotedIds) {
    if (leaderFromWaitlist && id === leaderDiscordId) {
      rows.push({
        kind: 'waitlist_new_group_leader',
        event_id: event.id,
        recipient_discord_id: id,
        dedupe_key: `newgroup:${event.id}:${id}:${groupIndex}`,
        payload: {eventTitle: event.title, groupIndex},
      });
    } else {
      rows.push({
        kind: 'waitlist_new_group',
        event_id: event.id,
        recipient_discord_id: id,
        dedupe_key: `newgroup:${event.id}:${id}:${groupIndex}`,
        payload: {eventTitle: event.title, groupIndex, leaderGamertag: leaderGt},
      });
    }
  }

  await enqueueNotifications(supabase, rows);
}

export async function enqueueEventUpdated(
  supabase: ReturnType<typeof adminClient>,
  event: EventNotifyRow,
  participants: ParticipantRow[],
  contentHash: string,
  tracks: unknown,
  carMode: string,
  maxPi: number | null | undefined,
  carCount: number,
  tracksChanged: boolean,
  carsChanged: boolean,
): Promise<void> {
  const rows: OutboxInsert[] = activeRacers(participants).map((p) => ({
    kind: 'event_updated',
    event_id: event.id,
    recipient_discord_id: p.discord_id,
    dedupe_key: `updated:${event.id}:${p.discord_id}:${contentHash}`,
    payload: {
      eventTitle: event.title,
      tracksChanged: tracksChanged ? '1' : '',
      carsChanged: carsChanged ? '1' : '',
      trackNames: JSON.stringify(
        (Array.isArray(tracks) ? tracks as {name?: string}[] : []).map((t) => (t.name ?? '').trim()).filter(Boolean),
      ),
      carMode,
      maxPi: maxPi ?? 800,
      carCount,
    },
  }));
  await enqueueNotifications(supabase, rows);
}

export async function enqueueHostGroupFilled(
  supabase: ReturnType<typeof adminClient>,
  event: EventNotifyRow,
  groupIndex: number,
): Promise<void> {
  await enqueueNotifications(supabase, [{
    kind: 'host_group_filled',
    event_id: event.id,
    recipient_discord_id: event.host_discord_id,
    dedupe_key: `host_group_full:${event.id}:${groupIndex}`,
    payload: {
      eventTitle: event.title,
      groupIndex,
      maxPlayers: event.max_players,
    },
  }]);
}

export async function enqueueHostLobbyFull(
  supabase: ReturnType<typeof adminClient>,
  event: EventNotifyRow,
  waitlistCount: number,
): Promise<void> {
  await enqueueNotifications(supabase, [{
    kind: 'host_lobby_full',
    event_id: event.id,
    recipient_discord_id: event.host_discord_id,
    dedupe_key: `host_lobby_full:${event.id}`,
    payload: {
      eventTitle: event.title,
      waitlistCount,
    },
  }]);
}

export async function scanStartingSoonReminders(
  supabase: ReturnType<typeof adminClient>,
): Promise<void> {
  const now = Date.now();
  // 20-minute window so a missed 1-min cron tick still enqueues 2h reminders.
  const windowStart = new Date(now + 110 * 60_000).toISOString();
  const windowEnd = new Date(now + 130 * 60_000).toISOString();

  const {data: events} = await supabase
    .from('events')
    .select('id, title, host_discord_id, max_players, group_count, starts_at, timezone, status, discord_message_id')
    .not('discord_message_id', 'is', null)
    .in('status', ['open', 'live'])
    .gte('starts_at', windowStart)
    .lte('starts_at', windowEnd);

  if (!events?.length) return;

  for (const event of events) {
    const {data: participants} = await supabase
      .from('event_participants')
      .select('discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
      .eq('event_id', event.id);

    const roster = participants ?? [];
    const tz = event.timezone ?? 'UTC';
    const groupCount = event.group_count ?? 1;
    const totalCapacity = groupCount * event.max_players;
    const activeCount = activeRacers(roster).length;
    const waitlistCount = roster.filter((r) => r.waitlisted).length;

    const racerRows: OutboxInsert[] = activeRacers(roster).map((p) => ({
      kind: 'event_starting_soon',
      event_id: event.id,
      recipient_discord_id: p.discord_id,
      dedupe_key: `soon2h:${event.id}:${p.discord_id}:${event.starts_at}`,
      payload: {
        eventTitle: event.title,
        startsAt: event.starts_at,
        timezone: tz,
        groupIndex: p.group_index ?? 1,
        leaderGamertag: leaderGamertag(roster, p.group_index ?? 1),
      },
    }));

    const hostRow: OutboxInsert = {
      kind: 'host_event_starting_soon',
      event_id: event.id,
      recipient_discord_id: event.host_discord_id,
      dedupe_key: `host_soon2h:${event.id}:${event.starts_at}`,
      payload: {
        eventTitle: event.title,
        startsAt: event.starts_at,
        timezone: tz,
        activeCount,
        totalCapacity,
        waitlistCount,
      },
    };

    await enqueueNotifications(supabase, [...racerRows, hostRow]);
  }
}

export function summarizeTracksForNotify(tracks: unknown, locale: string): string {
  const rows = Array.isArray(tracks) ? tracks as {name?: string}[] : [];
  const names = rows.map((t) => (t.name ?? '').trim()).filter(Boolean);
  if (names.length) return names.join(', ');
  return locale === 'ru' ? 'Список трасс обновлён' : 'Track list updated';
}

export function summarizeCarsForNotify(
  mode: string,
  maxPi: number | null | undefined,
  carCount: number,
  locale: string,
): string {
  if (mode === 'restricted_list') {
    if (locale === 'ru') return `Список машин обновлён (${carCount})`;
    return `Restricted list updated (${carCount} cars)`;
  }
  const cap = maxPi ?? 800;
  if (locale === 'ru') return `Любая машина · лимит PI ${cap}`;
  return `Anything goes · PI cap ${cap}`;
}
