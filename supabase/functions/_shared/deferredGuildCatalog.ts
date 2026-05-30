import {resolveGuildNameForUser} from './guildAccess.ts';
import {adminClient} from './supabase.ts';

declare const EdgeRuntime: {waitUntil: (promise: Promise<unknown>) => void} | undefined;

function logDeferredGuildCatalogFailure(guildId: string, detail: string): void {
  console.error(
    JSON.stringify({
      msg: 'deferred guild catalog upsert failed',
      guild_id: guildId,
      detail,
    }),
  );
}

/** Non-blocking guild name cache — safe to run after token-exchange responds. */
export function deferGuildCatalogUpsert(accessToken: string, guildId: string): void {
  const work = async () => {
    try {
      const canonicalName = await resolveGuildNameForUser(accessToken, guildId);
      if (!canonicalName) return;

      const supabase = adminClient();
      const {error} = await supabase.from('discord_guilds').upsert(
        {guild_id: guildId, guild_name: canonicalName},
        {onConflict: 'guild_id'},
      );
      if (error) logDeferredGuildCatalogFailure(guildId, error.message);
    } catch (e) {
      logDeferredGuildCatalogFailure(
        guildId,
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
    EdgeRuntime.waitUntil(work());
  } else {
    void work();
  }
}
