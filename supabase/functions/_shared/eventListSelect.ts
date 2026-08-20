/** Keep in sync with EVENT_LIST_SELECT in src/lib/events.ts */
export const EVENT_LIST_SELECT = `
  *,
  users!events_host_discord_id_fkey(username, avatar_url),
  discord_guilds(guild_name, icon_url, settings),
  event_participants(
    order: joined_at,
    discord_id,
    gamertag_snapshot,
    is_convoy_leader,
    participation_source,
    group_index,
    waitlisted,
    joined_at,
    users!event_participants_discord_id_fkey(username, avatar_url)
  ),
  event_cars(order: sort_order, sort_order, max_pi, tune_share_code, car_restrictions, cars(id, make, model, year, pi, abbreviation))
`;

/** Event detail — results, rating ledger, roster ELO (not on browse/list). */
export const EVENT_DETAIL_SELECT = `${EVENT_LIST_SELECT.replace(
  'users!event_participants_discord_id_fkey(username, avatar_url)',
  'users!event_participants_discord_id_fkey(username, avatar_url, player_ratings!player_ratings_discord_id_fkey(rating, games_rated))',
)},
  event_results(discord_id, position, dnf, dns, points, group_index),
  rating_ledger(discord_id, delta, rating_before, rating_after)`;
