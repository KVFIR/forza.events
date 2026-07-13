import {formatDiscordHandle} from '../lib/discordHandle';

type Props = {
  gamertag?: string;
  /** Discord unique handle from `users.username`. */
  username: string;
};

/** Primary line: Xbox gamertag (or Discord handle); second line: Discord when gamertag is set. */
export function ParticipantDisplayNames({gamertag, username}: Props) {
  const gt = gamertag?.trim();
  const handle = formatDiscordHandle(username);
  const primary = gt || handle || '—';
  const showDiscordLine = Boolean(handle && gt);

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
