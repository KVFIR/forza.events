/** Format stored Discord handle for UI (`user.username`, not display name). */
export function formatDiscordHandle(username: string): string {
  const handle = username.trim();
  if (!handle) return '';
  return handle.startsWith('@') ? handle : `@${handle}`;
}
