import {formatDiscordHandle} from '../lib/discordHandle';

type Props = {
  gamertag?: string;
  /** Discord unique handle from `users.username`. */
  username: string;
  /** Guests see Xbox gamertag only. */
  showDiscord?: boolean;
};

export function participantDisplayName(
  gamertag: string | undefined,
  username: string,
  showDiscord = true,
): {primary: string; discordLine: string | null} {
  const gt = gamertag?.trim();
  const handle = showDiscord ? formatDiscordHandle(username) : '';
  return {
    primary: gt || handle || '—',
    discordLine: handle && gt ? handle : null,
  };
}

/** Primary line: Xbox gamertag (or Discord handle); second line: Discord when gamertag is set. */
export function ParticipantDisplayNames({gamertag, username, showDiscord = true}: Props) {
  const {primary, discordLine} = participantDisplayName(gamertag, username, showDiscord);

  return (
    <>
      <p className="truncate text-xs font-medium text-slate-200">{primary}</p>
      {discordLine ? (
        <p className="truncate text-[10px] text-muted" title={discordLine}>
          {discordLine}
        </p>
      ) : null}
    </>
  );
}
