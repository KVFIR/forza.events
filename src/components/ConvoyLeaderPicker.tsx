import {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {listGuildMembers} from '../lib/api';
import {ApiRequestError} from '../lib/apiErrors';
import {cn} from '../lib/cn';
import {hasGamertag} from '../lib/gamertag';
import {Alert} from './ui/Alert';
import {Input} from './ui/Input';
import {controlInvalidClass} from './ui/formStyles';

export type ConvoyLeaderSelection = {
  discordId: string;
  displayName: string;
  xboxGamertag: string | null;
};

type GuildMemberHit = {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  xbox_gamertag: string | null;
};

type Props = {
  accessToken: string;
  guildId: string;
  hostDiscordId: string;
  selected: ConvoyLeaderSelection | null;
  gamertag: string;
  onSelect: (member: ConvoyLeaderSelection | null) => void;
  onGamertagChange: (tag: string) => void;
  invalid?: boolean;
  error?: string | null;
};

export function ConvoyLeaderPicker({
  accessToken,
  guildId,
  hostDiscordId,
  selected,
  gamertag,
  onSelect,
  onGamertagChange,
  invalid,
  error,
}: Props) {
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GuildMemberHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!guildId || query.trim().length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      void listGuildMembers(accessToken, guildId, query.trim())
        .then((res) => {
          setHits(
            res.members.filter((m) => m.discord_id !== hostDiscordId),
          );
        })
        .catch((e) => {
          setHits([]);
          setSearchError(
            e instanceof ApiRequestError || e instanceof Error
              ? e.message
              : String(e),
          );
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [accessToken, guildId, hostDiscordId, query]);

  const needsGamertag = Boolean(selected && !hasGamertag(selected.xboxGamertag ?? gamertag));

  return (
    <div className="mt-2 space-y-2">
      {!guildId ? (
        <p className="text-xs text-muted">{t('create.convoyLeaderPickServerFirst')}</p>
      ) : (
        <>
          {selected ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-card px-3 py-2">
              {selected.displayName && (
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {selected.displayName}
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
                            displayName: m.display_name,
                            xboxGamertag: m.xbox_gamertag,
                          });
                          onGamertagChange(tag);
                          setQuery('');
                          setHits([]);
                        }}
                      >
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="h-7 w-7 shrink-0 rounded-full"
                          />
                        ) : (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                            {m.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{m.display_name}</span>
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
