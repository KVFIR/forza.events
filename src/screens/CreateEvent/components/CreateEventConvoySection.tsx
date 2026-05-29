import {useTranslation} from 'react-i18next';
import {ConvoyLeaderPicker, type ConvoyLeaderSelection} from '../../../components/ConvoyLeaderPicker';
import {Alert} from '../../../components/ui/Alert';
import {TextButton} from '../../../components/ui/TextButton';
import {toggleRowClass} from '../../../components/ui/formStyles';
import {hasGamertag} from '../../../lib/gamertag';
import {FormSection} from './Field';
import type {FieldErrors} from '../types';

export type CreateEventConvoySectionProps = {
  accessToken: string;
  guildId: string;
  guildName: string;
  hostDiscordId: string;
  hostGamertag?: string;
  lobbyLeaderIsHost: boolean;
  lobbyLeaderSelection: ConvoyLeaderSelection | null;
  lobbyLeaderGamertag: string;
  fieldErrors: FieldErrors;
  onLobbyLeaderIsHost: (v: boolean) => void;
  onLobbyLeaderSelect: (member: ConvoyLeaderSelection | null) => void;
  onLobbyLeaderGamertag: (v: string) => void;
  onAddHostGamertag?: () => void;
};

type Props = CreateEventConvoySectionProps;

export function CreateEventConvoySection({
  accessToken,
  guildId,
  guildName,
  hostDiscordId,
  hostGamertag,
  lobbyLeaderIsHost,
  lobbyLeaderSelection,
  lobbyLeaderGamertag,
  fieldErrors,
  onLobbyLeaderIsHost,
  onLobbyLeaderSelect,
  onLobbyLeaderGamertag,
  onAddHostGamertag,
}: Props) {
  const {t} = useTranslation();

  return (
    <FormSection title={t('create.sectionConvoy')}>
      <label className={toggleRowClass}>
        <span className="text-sm text-slate-300">{t('create.iAmConvoyLeader')}</span>
        <input
          type="checkbox"
          checked={lobbyLeaderIsHost}
          onChange={(e) => onLobbyLeaderIsHost(e.target.checked)}
          className="h-4 w-4 accent-white"
        />
      </label>
      {lobbyLeaderIsHost && !hasGamertag(hostGamertag) && (
        <div id="create-lobbyLeaderGamertag" tabIndex={-1} className="outline-none">
          <Alert variant="warning">
            <p>{t('create.convoyLeaderProfileWarning')}</p>
            {onAddHostGamertag ? (
              <TextButton type="button" className="mt-2" onClick={onAddHostGamertag}>
                {t('profile.addGamertag')}
              </TextButton>
            ) : null}
          </Alert>
          {fieldErrors.lobbyLeaderGamertag ? (
            <p role="alert" className="mt-2 text-xs text-red-300/90">
              {fieldErrors.lobbyLeaderGamertag}
            </p>
          ) : null}
        </div>
      )}
      {!lobbyLeaderIsHost && (
        <ConvoyLeaderPicker
          accessToken={accessToken}
          guildId={guildId}
          guildName={guildName || undefined}
          hostDiscordId={hostDiscordId}
          selected={lobbyLeaderSelection}
          gamertag={lobbyLeaderGamertag}
          onSelect={onLobbyLeaderSelect}
          onGamertagChange={onLobbyLeaderGamertag}
          invalid={Boolean(
            fieldErrors.lobbyLeaderGamertag || fieldErrors.lobbyLeaderDiscordId,
          )}
          error={
            fieldErrors.lobbyLeaderDiscordId ?? fieldErrors.lobbyLeaderGamertag ?? null
          }
        />
      )}
    </FormSection>
  );
}
