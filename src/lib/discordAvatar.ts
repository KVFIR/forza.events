/** Build Discord CDN avatar URL (custom, animated, or default). Keep in sync with supabase/functions/_shared/discord.ts */
export function discordAvatarUrl(
  user: {id: string; avatar?: string | null; discriminator?: string | null},
  size = 128,
): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }
  const index = discordDefaultAvatarIndex(user);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function discordDefaultAvatarIndex(user: {
  id: string;
  discriminator?: string | null;
}): number {
  const disc = user.discriminator?.trim();
  if (disc && disc !== '0') {
    const n = parseInt(disc, 10);
    if (!Number.isNaN(n)) return n % 5;
  }
  try {
    return Number((BigInt(user.id) >> 22n) % 6n);
  } catch {
    return 0;
  }
}
