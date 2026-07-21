import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {optionalDiscordUser} from '../_shared/discordRequestAuth.ts';
import {driverRatingFromRow} from '../_shared/driverRatingPayload.ts';
import {rateLimitAuth, rateLimitPublicRead} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  const readLimited = await rateLimitPublicRead(req);
  if (readLimited) return readLimited;

  const auth = await optionalDiscordUser(req);
  if (auth instanceof Response) return auth;

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
      }];
    }).map((entry, index) => ({...entry, rank: index + 1}));

    let viewer: {
      rank: number;
      rating: number;
      gamesRated: number;
      provisional: boolean;
    } | null = null;

    if (auth) {
      const inTop = entries.find((e) => e.discordId === auth.id);
      if (inTop) {
        viewer = {
          rank: inTop.rank,
          rating: inTop.rating,
          gamesRated: inTop.gamesRated,
          provisional: inTop.provisional,
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
          viewer = {
            rank: (count ?? 0) + 1,
            rating: rating.rating,
            gamesRated: rating.gamesRated,
            provisional: rating.provisional,
          };
        }
      }
    }

    return jsonResponse({entries, viewer, limit}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
