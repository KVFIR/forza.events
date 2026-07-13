import {useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {listGuildMembers} from '../lib/api';
import {ApiRequestError} from '../lib/apiErrors';
import {cn} from '../lib/cn';
import {formatDiscordHandle} from '../lib/discordHandle';
import {hasGamertag} from '../lib/gamertag';
import {Alert} from './ui/Alert';
import {UserAvatar} from './UserAvatar';
import {Input} from './ui/Input';
import {controlInvalidClass} from './ui/formStyles';

export type ConvoyLeaderSelection = {
  discordId: string;
  /** Discord unique handle (`user.username`). */
  username: string;
  xboxGamertag: string | null;
};

type GuildMemberHit = {
  discord_id: string;
  username: string;
  avatar_url: string | null;
  xbox_gamertag: string | null;
};

export type ConvoyLeaderCandidate = {
  discordId: string;
  username: string;
  gamertag: string | null;
  avatarUrl?: string | null;
};

type Props = {
  accessToken: string;
  guildId: string;
  guildName?: string;
  hostDiscordId: string;
  selected: ConvoyLeaderSelection | null;
  gamertag: string;
  onSelect: (member: ConvoyLeaderSelection | null) => void;
  onGamertagChange: (tag: string) => void;
  invalid?: boolean;
  error?: string | null;
  /** Quick-pick candidates shown above search (e.g. the event waitlist). */
  candidates?: ConvoyLeaderCandidate[];
  candidatesLabel?: string;
  /** When true, the host may appear in quick-pick and guild search (Add group flow). */
  allowHostCandidate?: boolean;
  /** Active convoy leaders blocked from guild search (Add group flow). */
  excludeDiscordIds?: readonly string[];
  /** Hide guild search when only in-group driver swaps are valid (change-leader, full group). */
  disableGuildSearch?: boolean;
};

export function ConvoyLeaderPicker({
  accessToken,
  guildId,
  guildName,
  hostDiscordId,
  selected,
  gamertag,
  onSelect,
  onGamertagChange,
  invalid,
  error,
  candidates,
  candidatesLabel,
  allowHostCandidate = false,
  excludeDiscordIds = [],
  disableGuildSearch = false,
}: Props) {
  const {t} = useTranslation();
  const excludedIds = useMemo(
    () => new Set(excludeDiscordIds),
    [excludeDiscordIds],
  );
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GuildMemberHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSerialRef = useRef(0);

  useEffect(() => {
    setQuery('');
    setHits([]);
    setSearchError(null);
  }, [guildId]);

  useEffect(() => {
    if (!guildId || query.trim().length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const serial = ++searchSerialRef.current;
      setSearching(true);
      setSearchError(null);
      void listGuildMembers(accessToken, guildId, query.trim())
        .then((res) => {
          if (serial !== searchSerialRef.current) return;
          setHits(
            res.members.filter((m) => {
              if (excludedIds.has(m.discord_id)) return false;
              return allowHostCandidate || m.discord_id !== hostDiscordId;
            }),
          );
        })
        .catch((e) => {
          if (serial !== searchSerialRef.current) return;
          setHits([]);
          setSearchError(
            e instanceof ApiRequestError || e instanceof Error
              ? e.message
              : String(e),
          );
        })
        .finally(() => {
          if (serial === searchSerialRef.current) setSearching(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [accessToken, guildId, hostDiscordId, query, allowHostCandidate, excludedIds]);

  /** Profile tag at pick time only — do not fold in `gamertag` while typing or the field unmounts. */
  const needsGamertag = Boolean(selected && !hasGamertag(selected.xboxGamertag));

  return (
    <div id="create-lobbyLeaderDiscordId" className="mt-2 space-y-2">
      {!guildId ? (
        <p className="text-xs text-muted">{t('create.convoyLeaderPickServerFirst')}</p>
      ) : (
        <>
          {guildName ? (
            <p className="text-xs text-muted">
              {t('create.convoyLeaderSearchIn', {server: guildName})}
            </p>
          ) : null}
          {selected ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-card px-3 py-2">
              {selected.username && (
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {formatDiscordHandle(selected.username)}
                </span>
              )}
              <button
                type="button"
                className="shrink-0 text-xs text-muted underline hover:text-white"
                onClick={() => {
                  onSelect(null);
                  setQuery('');
                  onGamertagChange('');
                }}
              >
                {t('create.convoyLeaderClear')}
              </button>
            </div>
          ) : (
            <>
              {candidates && candidates.length > 0 && (
                <div className="space-y-1">
                  {candidatesLabel ? (
                    <p className="text-xs text-muted">{candidatesLabel}</p>
                  ) : null}
                  <ul
                    className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-card"
                    role="listbox"
                  >
                    {candidates
                      .filter((c) => allowHostCandidate || c.discordId !== hostDiscordId)
                      .map((c) => (
                        <li key={c.discordId}>
                          <button
                            type="button"
                            role="option"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]"
                            onClick={() => {
                              onSelect({
                                discordId: c.discordId,
                                username: c.username,
                                xboxGamertag: c.gamertag,
                              });
                              onGamertagChange(c.gamertag?.trim() ?? '');
                            }}
                          >
                            <UserAvatar
                              src={c.avatarUrl ?? undefined}
                              name={c.username || (c.gamertag ?? '')}
                              size="sm"
                              variant="neutral"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              <span className="font-medium">{formatDiscordHandle(c.username)}</span>
                              {c.gamertag && (
                                <span className="ml-1 text-xs text-muted">{c.gamertag}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {disableGuildSearch ? (
                <p className="text-xs text-muted">{t('changeGroupLeader.guildSearchDisabled')}</p>
              ) : (
                <>
                  <Input
                    id="create-convoyLeaderSearch"
                    placeholder={t('create.convoyLeaderSearchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    invalid={invalid}
                    autoComplete="off"
                  />
                  {searchError && (
                    <Alert variant="warning">{searchError}</Alert>
                  )}
                  {searching && (
                    <p className="text-xs text-muted">{t('create.convoyLeaderSearching')}</p>
                  )}
                  {!searching && query.trim().length >= 2 && hits.length === 0 && !searchError && (
                    <p className="text-xs text-muted">{t('create.convoyLeaderNoResults')}</p>
                  )}
                  {hits.length > 0 && (
                    <ul
                      className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-card"
                      role="listbox"
                    >
                      {hits.map((m) => (
                        <li key={m.discord_id}>
                          <button
                            type="button"
                            role="option"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]"
                            onClick={() => {
                              const tag = m.xbox_gamertag?.trim() ?? '';
                              onSelect({
                                discordId: m.discord_id,
                                username: m.username,
                                xboxGamertag: m.xbox_gamertag,
                              });
                              onGamertagChange(tag);
                              setQuery('');
                              setHits([]);
                            }}
                          >
                            <UserAvatar
                              src={m.avatar_url}
                              name={m.username}
                              size="sm"
                              variant="neutral"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              <span className="font-medium">{formatDiscordHandle(m.username)}</span>
                              {m.xbox_gamertag && (
                                <span className="ml-1 text-xs text-muted">{m.xbox_gamertag}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {needsGamertag && (
        <div>
          <p className="mb-1 text-xs text-muted">{t('create.convoyLeaderGamertagHint')}</p>
          <Input
            id="create-lobbyLeaderGamertag"
            className={cn(invalid && controlInvalidClass)}
            placeholder={t('create.xboxGamertag')}
            value={gamertag}
            onChange={(e) => onGamertagChange(e.target.value)}
            maxLength={15}
            invalid={invalid}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-300/90">
          {error}
        </p>
      )}
    </div>
  );
}
