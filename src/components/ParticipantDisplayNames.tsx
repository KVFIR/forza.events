import {formatDiscordHandle} from '../lib/discordHandle';

type Props = {
  gamertag?: string;
  /** Discord unique handle from `users.username`. */
  username: string;
  /** When true, show Discord handle under the Xbox gamertag (host view). */
  showDiscordUsername?: boolean;
};

/** Primary line: Xbox gamertag; optional second line: Discord handle for hosts. */
export function ParticipantDisplayNames({
  gamertag,
  username,
  showDiscordUsername = false,
}: Props) {
  const gt = gamertag?.trim();
  const handle = formatDiscordHandle(username);
  const primary = gt || handle || '—';
  const showDiscordLine = showDiscordUsername && !!handle && !!gt;

  return (
    <>
      <p className="truncate text-xs font-medium text-slate-200">{primary}</p>
      {showDiscordLine ? (
        <p className="truncate text-[10px] text-muted" title={handle}>
          {handle}
        </p>
      ) : null}
    </>
  );
}
