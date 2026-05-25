-- Allow anon clients to resolve guild names on event cards
CREATE POLICY "public discord_guilds readable"
  ON discord_guilds FOR SELECT
  USING (true);
