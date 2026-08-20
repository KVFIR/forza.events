import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {optionalDiscordUser} from '../_shared/discordRequestAuth.ts';
import {driverRatingFromRow} from '../_shared/driverRatingPayload.ts';
import {
  indexLatestRaces,
  mapViewerRaces,
  type LatestRaceRow,
  type LeaderboardLastRace,
} from '../_shared/leaderboardRaces.ts';
import {rateLimitAuth, rateLimitPublicRead} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const VIEWER_RACES_LIMIT = 8;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  const readLimited = await rateLimitPublicRead(req);
  if (readLimited) return readLimited;

  const auth = await optionalDiscordUser(req);

  if (auth) {
    const limited = await rateLimitAuth(req, auth.id);
    if (limited) return limited;
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(
      Math.max(1, Number(body?.limit) || DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    const supabase = adminClient();
    const {data: topRows, error} = await supabase
      .from('player_ratings')
      .select('discord_id, rating, games_rated, users!player_ratings_discord_id_fkey(username, avatar_url, xbox_gamertag)')
      .gt('games_rated', 0)
      .order('rating', {ascending: false})
      .order('games_rated', {ascending: false})
      .limit(limit);

    if (error) throw error;

    const entries = (topRows ?? []).flatMap((row) => {
      const rating = driverRatingFromRow(row);
      if (!rating) return [];
      const userJoin = Array.isArray(row.users) ? row.users[0] : row.users;
      return [{
        discordId: row.discord_id,
        username: userJoin?.username ?? null,
        avatarUrl: userJoin?.avatar_url ?? null,
        gamertag: userJoin?.xbox_gamertag ?? null,
        rating: rating.rating,
        gamesRated: rating.gamesRated,
        provisional: rating.provisional,
        lastRace: null as LeaderboardLastRace | null,
      }];
    }).map((entry, index) => ({...entry, rank: index + 1}));

    const raceIds = entries.map((entry) => entry.discordId);
    if (auth && !raceIds.includes(auth.id)) raceIds.push(auth.id);

    let lastById = new Map<string, NonNullable<(typeof entries)[number]['lastRace']>>();
    if (raceIds.length > 0) {
      const {data: lastRows, error: lastError} = await supabase.rpc(
        'latest_rating_races',
        {p_discord_ids: raceIds},
      );
      if (lastError) {
        // ponytail: RPC added in 038 — page still ranks if this deploy is Edge-before-db
        console.error(JSON.stringify({
          msg: 'latest_rating_races failed',
          detail: lastError.message,
        }));
      } else {
        lastById = indexLatestRaces((lastRows ?? []) as LatestRaceRow[]);
        const lastEventIds = [...new Set([...lastById.values()].map((race) => race.eventId))];
        if (lastEventIds.length > 0) {
          const {data: slugRows} = await supabase
            .from('events')
            .select('id, slug')
            .in('id', lastEventIds);
          const slugById = new Map<string, string>();
          for (const row of slugRows ?? []) {
            const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
            if (slug) slugById.set(row.id, slug);
          }
          for (const [discordId, race] of lastById) {
            const slug = slugById.get(race.eventId);
            if (slug) lastById.set(discordId, {...race, slug});
          }
        }
        for (const entry of entries) {
          entry.lastRace = lastById.get(entry.discordId) ?? null;
        }
      }
    }

    let viewer: {
      rank: number;
      rating: number;
      gamesRated: number;
      provisional: boolean;
      lastDelta: number | null;
      lastRace: (typeof entries)[number]['lastRace'];
      races: ReturnType<typeof mapViewerRaces>;
    } | null = null;

    if (auth) {
      const inTop = entries.find((e) => e.discordId === auth.id);
      if (inTop) {
        viewer = {
          rank: inTop.rank,
          rating: inTop.rating,
          gamesRated: inTop.gamesRated,
          provisional: inTop.provisional,
          lastDelta: inTop.lastRace?.delta ?? null,
          lastRace: inTop.lastRace,
          races: [],
        };
      } else {
        const {data: own} = await supabase
          .from('player_ratings')
          .select('rating, games_rated')
          .eq('discord_id', auth.id)
          .maybeSingle();
        const rating = driverRatingFromRow(own);
        if (rating) {
          const {count} = await supabase
            .from('player_ratings')
            .select('discord_id', {count: 'exact', head: true})
            .gt('games_rated', 0)
            .or(
              `rating.gt.${own!.rating},and(rating.eq.${own!.rating},games_rated.gt.${own!.games_rated})`,
            );
          const lastRace = lastById.get(auth.id) ?? null;
          viewer = {
            rank: (count ?? 0) + 1,
            rating: rating.rating,
            gamesRated: rating.gamesRated,
            provisional: rating.provisional,
            lastDelta: lastRace?.delta ?? null,
            lastRace,
            races: [],
          };
        }
      }

      if (viewer) {
        const {data: hist, error: histError} = await supabase
          .from('rating_ledger')
          .select('event_id, delta, rating_after, events!inner(title, starts_at, slug)')
          .eq('discord_id', auth.id)
          .order('created_at', {ascending: false})
          .limit(VIEWER_RACES_LIMIT);
        if (histError) {
          console.error(JSON.stringify({
            msg: 'leaderboard viewer races failed',
            detail: histError.message,
          }));
        } else {
          viewer.races = mapViewerRaces(hist ?? []);
          if (viewer.lastDelta == null && viewer.races[0]) {
            viewer.lastDelta = viewer.races[0].delta;
          }
        }
      }
    }

    return jsonResponse({entries, viewer, limit}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
