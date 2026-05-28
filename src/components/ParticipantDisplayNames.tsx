type Props = {
  gamertag?: string;
  username: string;
  /** When true, show Discord display name under the Xbox gamertag (host view). */
  showDiscordUsername?: boolean;
};

/** Primary line: Xbox gamertag; optional second line: Discord username for hosts. */
export function ParticipantDisplayNames({
  gamertag,
  username,
  showDiscordUsername = false,
}: Props) {
  const gt = gamertag?.trim();
  const discord = username.trim();
  const primary = gt || discord || '—';
  /** Host view: Discord name under gamertag (always when both are present). */
  const showDiscordLine = showDiscordUsername && !!discord && !!gt;

  return (
    <>
      <p className="truncate text-xs font-medium text-slate-200">{primary}</p>
      {showDiscordLine ? (
        <p className="truncate text-[10px] text-muted" title={discord}>
          {discord}
        </p>
      ) : null}
    </>
  );
}
