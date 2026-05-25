/** Keep in sync with EVENT_LIST_SELECT in src/lib/events.ts */
export const EVENT_LIST_SELECT = `
  *,
  users!events_host_discord_id_fkey(username, avatar_url),
  discord_guilds(guild_name),
  event_participants(discord_id, gamertag_snapshot),
  event_cars(max_pi, tune_share_code, car_restrictions, cars(id, make, model, year, pi))
`;
