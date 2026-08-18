import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import type {DiscordUser} from '../_shared/discord.ts';
import {
  discordUserFromInteraction,
  ephemeralInteractionResponse,
  eventIdFromJoinEventCustomId,
  eventIdFromJoinModalCustomId,
  eventIdFromLeaveEventCustomId,
  gamertagFromModalSubmit,
  joinErrorCopy,
  joinGamertagModalResponse,
  joinInteractionResponse,
  leaveInteractionResponse,
} from '../_shared/embedJoin.ts';
import {
  eventIdFromViewResultsCustomId,
  formatEmbedResultsContent,
  viewResultsInteractionResponse,
} from '../_shared/embedResults.ts';
import {deferSyncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {joinEventParticipant, leaveEventParticipant} from '../_shared/eventJoin.ts';
import {eventIdFromOpenEventCustomId} from '../_shared/eventLaunch.ts';
import {validateGamertag} from '../_shared/gamertag.ts';
import {enforceRateLimit} from '../_shared/rateLimit.ts';
import {adminClient} from '../_shared/supabase.ts';

const INTERACTION_PING = 1;
const INTERACTION_COMPONENT = 3;
const INTERACTION_MODAL_SUBMIT = 5;
const RESPONSE_LAUNCH_ACTIVITY = 12;

function verifySignature(req: Request, body: string): boolean {
  const publicKey = Deno.env.get('DISCORD_PUBLIC_KEY');
  if (!publicKey) return false;

  const signature = req.headers.get('X-Signature-Ed25519');
  const timestamp = req.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return false;

  return nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(publicKey),
  );
}

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

function json(payload: unknown): Response {
  return Response.json(payload);
}

function unknownInteraction(): Response {
  return json(ephemeralInteractionResponse('Unknown interaction'));
}

async function completeEmbedJoin(
  user: DiscordUser,
  eventId: string,
  gamertag: string,
): Promise<Response> {
  const supabase = adminClient();
  try {
    const result = await joinEventParticipant(supabase, {
      eventId,
      discordUser: user,
      gamertag,
      syncEmbed: false,
    });
    if (result.ok) {
      deferSyncPublishedEmbedByEventId(supabase, eventId);
    }
    return json(joinInteractionResponse(result, eventId));
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'embed join failed',
        eventId,
        discordId: user.id,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return json(joinInteractionResponse({ok: false, code: API_ERROR_CODES.INTERNAL}, eventId));
  }
}

async function handleJoinButton(interaction: {
  data?: {custom_id?: string};
  member?: {user?: DiscordUser};
  user?: DiscordUser;
}): Promise<Response> {
  const eventId = eventIdFromJoinEventCustomId(interaction.data?.custom_id);
  if (!eventId) return unknownInteraction();

  const user = discordUserFromInteraction(interaction);
  if (!user) {
    return json(ephemeralInteractionResponse('Could not resolve your Discord user.'));
  }

  try {
    const allowed = await enforceRateLimit(`mut:${user.id}`, 40, 60);
    if (!allowed) {
      return json(joinInteractionResponse({ok: false, code: API_ERROR_CODES.TOO_MANY_REQUESTS}, eventId));
    }

    const supabase = adminClient();
    const {data} = await supabase
      .from('users')
      .select('xbox_gamertag')
      .eq('discord_id', user.id)
      .maybeSingle();
    const stored = data?.xbox_gamertag?.trim() ?? '';
    const tag = validateGamertag(stored);
    if (!tag.ok) {
      return json(joinGamertagModalResponse(eventId));
    }
    return completeEmbedJoin(user, eventId, tag.gamertag);
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'embed join failed',
        eventId,
        discordId: user.id,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return json(joinInteractionResponse({ok: false, code: API_ERROR_CODES.INTERNAL}, eventId));
  }
}

async function handleJoinModal(interaction: {
  data?: {custom_id?: string; components?: unknown[]};
  member?: {user?: DiscordUser};
  user?: DiscordUser;
}): Promise<Response> {
  const eventId = eventIdFromJoinModalCustomId(interaction.data?.custom_id);
  if (!eventId) return unknownInteraction();

  const user = discordUserFromInteraction(interaction);
  if (!user) {
    return json(ephemeralInteractionResponse('Could not resolve your Discord user.'));
  }

  const allowed = await enforceRateLimit(`mut:${user.id}`, 40, 60);
  if (!allowed) {
    return json(joinInteractionResponse({ok: false, code: API_ERROR_CODES.TOO_MANY_REQUESTS}, eventId));
  }

  const tag = validateGamertag(gamertagFromModalSubmit(interaction.data));
  if (!tag.ok) {
    return json(ephemeralInteractionResponse(tag.error));
  }
  return completeEmbedJoin(user, eventId, tag.gamertag);
}

const EPHEMERAL_FLAG = 64;

function isEphemeralMessage(interaction: {message?: {flags?: number}}): boolean {
  return Boolean(Number(interaction.message?.flags ?? 0) & EPHEMERAL_FLAG);
}

async function handleLeaveButton(interaction: {
  data?: {custom_id?: string};
  message?: {flags?: number};
  member?: {user?: DiscordUser};
  user?: DiscordUser;
}): Promise<Response> {
  const eventId = eventIdFromLeaveEventCustomId(interaction.data?.custom_id);
  if (!eventId) return unknownInteraction();

  const user = discordUserFromInteraction(interaction);
  if (!user) {
    return json(ephemeralInteractionResponse('Could not resolve your Discord user.'));
  }

  const allowed = await enforceRateLimit(`mut:${user.id}`, 40, 60);
  if (!allowed) {
    return json(
      leaveInteractionResponse(
        {ok: false, code: API_ERROR_CODES.TOO_MANY_REQUESTS},
        eventId,
        {updateMessage: isEphemeralMessage(interaction)},
      ),
    );
  }

  const supabase = adminClient();
  try {
    const result = await leaveEventParticipant(supabase, {
      eventId,
      discordId: user.id,
      syncEmbed: false,
    });
    if (result.ok && result.removed) {
      deferSyncPublishedEmbedByEventId(supabase, eventId);
    }
    return json(
      leaveInteractionResponse(result, eventId, {updateMessage: isEphemeralMessage(interaction)}),
    );
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'embed leave failed',
        eventId,
        discordId: user.id,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return json(
      leaveInteractionResponse(
        {ok: false, code: API_ERROR_CODES.INTERNAL},
        eventId,
        {updateMessage: isEphemeralMessage(interaction)},
      ),
    );
  }
}

async function handleViewResults(interaction: {
  data?: {custom_id?: string};
  member?: {user?: {id?: string}};
  user?: {id?: string};
}): Promise<Response> {
  const eventId = eventIdFromViewResultsCustomId(interaction.data?.custom_id);
  if (!eventId) return unknownInteraction();

  const discordId = interaction.member?.user?.id ?? interaction.user?.id ?? 'anon';
  const allowed = await enforceRateLimit(`embed:${discordId}`, 40, 60);
  if (!allowed) {
    return json(
      viewResultsInteractionResponse(joinErrorCopy(API_ERROR_CODES.TOO_MANY_REQUESTS), eventId),
    );
  }

  const supabase = adminClient();
  try {
    const {data: event, error: eventErr} = await supabase
      .from('events')
      .select('id, title, type')
      .eq('id', eventId)
      .maybeSingle();
    if (eventErr || !event) {
      return json(ephemeralInteractionResponse('Event not found.'));
    }

    const type = String(event.type ?? '');
    if (type === 'cruise') {
      return json(
        viewResultsInteractionResponse(
          formatEmbedResultsContent({title: String(event.title ?? ''), type, rows: []}),
          eventId,
        ),
      );
    }

    const [{data: results, error: resultErr}, {data: parts}, {data: ledger}] = await Promise.all([
      supabase
        .from('event_results')
        .select('discord_id, position, dnf, dns, points, group_index')
        .eq('event_id', eventId),
      supabase
        .from('event_participants')
        .select('discord_id, gamertag_snapshot')
        .eq('event_id', eventId),
      supabase.from('rating_ledger').select('discord_id, delta').eq('event_id', eventId),
    ]);
    if (resultErr) {
      console.error(
        JSON.stringify({msg: 'embed results load failed', eventId, detail: resultErr.message}),
      );
      return json(ephemeralInteractionResponse("Couldn't load results. Try again."));
    }

    const labelById = new Map(
      (parts ?? []).map((row) => [
        row.discord_id as string,
        String(row.gamertag_snapshot ?? '').trim() || 'Driver',
      ]),
    );
    const deltaById = new Map(
      (ledger ?? []).map((row) => [row.discord_id as string, row.delta as number]),
    );
    const rows = (results ?? []).map((row) => ({
      discord_id: String(row.discord_id),
      position: row.position as number | null,
      dnf: Boolean(row.dnf),
      dns: Boolean(row.dns),
      points: (row.points as number | null) ?? null,
      group_index: (row.group_index as number | null) ?? 1,
      label: labelById.get(String(row.discord_id)) ?? 'Driver',
      ratingDelta: deltaById.get(String(row.discord_id)) ?? null,
    }));

    return json(
      viewResultsInteractionResponse(
        formatEmbedResultsContent({title: String(event.title ?? ''), type, rows}),
        eventId,
      ),
    );
  } catch (e) {
    console.error(
      JSON.stringify({
        msg: 'embed results failed',
        eventId,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return json(ephemeralInteractionResponse("Couldn't load results. Try again."));
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {status: 405});
  }

  const body = await req.text();
  const valid = verifySignature(req, body);
  if (!valid) {
    return new Response('Invalid signature', {status: 401});
  }

  const interaction = JSON.parse(body);

  if (interaction.type === INTERACTION_PING) {
    return json({type: 1});
  }

  if (interaction.type === INTERACTION_COMPONENT) {
    const customId = interaction.data?.custom_id as string | undefined;
    if (eventIdFromJoinEventCustomId(customId)) {
      return handleJoinButton(interaction);
    }
    if (eventIdFromLeaveEventCustomId(customId)) {
      return handleLeaveButton(interaction);
    }
    if (eventIdFromViewResultsCustomId(customId)) {
      return handleViewResults(interaction);
    }
    const eventId = eventIdFromOpenEventCustomId(customId);
    if (eventId) {
      const discordId = interaction.member?.user?.id ?? interaction.user?.id;
      const guildId = (interaction.guild_id as string | undefined) ?? null;

      if (discordId && eventId) {
        const supabase = adminClient();
        const {error} = await supabase.from('launch_intents').insert({
          discord_id: discordId,
          guild_id: guildId,
          event_id: eventId,
        });
        if (error) {
          console.error(
            JSON.stringify({
              msg: 'launch_intents insert failed',
              eventId,
              discordId,
              guildId,
              detail: error.message,
            }),
          );
        }
        await supabase
          .from('launch_intents')
          .delete()
          .lt('created_at', new Date(Date.now() - 60_000).toISOString());
      }

      return json({type: RESPONSE_LAUNCH_ACTIVITY});
    }
  }

  if (interaction.type === INTERACTION_MODAL_SUBMIT) {
    const customId = interaction.data?.custom_id as string | undefined;
    if (eventIdFromJoinModalCustomId(customId)) {
      return handleJoinModal(interaction);
    }
  }

  return unknownInteraction();
});
