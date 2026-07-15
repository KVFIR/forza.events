import {buildGuildCatalogUpsert} from './guildCatalog.ts';
import {resolveUserGuild} from './guildAccess.ts';
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
      const guild = await resolveUserGuild(accessToken, guildId);
      if (!guild?.name) return;

      const supabase = adminClient();
      const {error} = await supabase.from('discord_guilds').upsert(
        buildGuildCatalogUpsert(guildId, guild.name, guild),
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
