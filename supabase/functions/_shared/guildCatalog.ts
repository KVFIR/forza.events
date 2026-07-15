import {guildIconCdnUrl, type DiscordGuildSummary} from './discord.ts';

export type GuildCatalogUpsert = {
  guild_id: string;
  guild_name: string;
  icon_url?: string;
  settings?: Record<string, unknown>;
};

type BuildGuildCatalogOptions = {
  inviteUrl?: string | null;
  existingSettings?: unknown;
};

export function buildGuildCatalogUpsert(
  guildId: string,
  guildName: string,
  guild?: Pick<DiscordGuildSummary, 'icon'> | null,
  options?: BuildGuildCatalogOptions,
): GuildCatalogUpsert {
  const row: GuildCatalogUpsert = {
    guild_id: guildId,
    guild_name: guildName,
  };

  const iconUrl = guildIconCdnUrl(guildId, guild?.icon ?? null);
  if (iconUrl) row.icon_url = iconUrl;

  const inviteUrl = options?.inviteUrl?.trim();
  if (inviteUrl && options) {
    const existingSettings = options.existingSettings;
    const base =
      existingSettings &&
        typeof existingSettings === 'object' &&
        !Array.isArray(existingSettings)
        ? {...(existingSettings as Record<string, unknown>)}
        : {};
    row.settings = {...base, invite_url: inviteUrl};
  }

  return row;
}
