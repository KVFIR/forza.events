import {useTranslation} from 'react-i18next';
import {PublishTargetPicker} from '../../../components/PublishTargetPicker';
import {
  CreateEventConvoySection,
  type CreateEventConvoySectionProps,
} from '../components/CreateEventConvoySection';
import {FormSection} from '../components/Field';
import {toggleRowClass} from '../../../components/ui/formStyles';
import {isLocalDevHost} from '../../../lib/runtime';
import type {CreateEventType, FieldErrors} from '../types';

type Props = {
  token: string | null;
  accessToken: string;
  guildId: string;
  guildName: string;
  channelId: string;
  lockGuild: boolean;
  lockChannel: boolean;
  fieldErrors: FieldErrors;
  convoy: CreateEventConvoySectionProps;
  eventType: CreateEventType;
  isRanked: boolean;
  targetGuildRatingEnabled: boolean;
  lockRanked: boolean;
  onIsRankedChange: (v: boolean) => void;
  onGuildChange: (id: string, name: string, ratingEnabled?: boolean) => void;
  onChannelChange: (id: string) => void;
};

export function PublishStep({
  token,
  accessToken,
  guildId,
  guildName,
  channelId,
  lockGuild,
  lockChannel,
  fieldErrors,
  convoy,
  eventType,
  isRanked,
  targetGuildRatingEnabled,
  lockRanked,
  onIsRankedChange,
  onGuildChange,
  onChannelChange,
}: Props) {
  const {t} = useTranslation();
  const devPreview = isLocalDevHost() && !token;
  const canRank =
    targetGuildRatingEnabled && (eventType === 'road' || eventType === 'dirt');

  if (!token && !devPreview) {
    return <p className="text-sm text-muted">{t('auth.openInDiscordTarget')}</p>;
  }

  return (
    <div className="space-y-3">
      <FormSection title={t('create.publishTarget')}>
        {devPreview ? (
          <p className="text-sm text-muted">{t('create.devPublishPreviewHint')}</p>
        ) : (
          <>
            {(fieldErrors.targetGuildId || fieldErrors.targetChannelId) && (
              <p role="alert" className="text-xs text-red-300/90">
                {fieldErrors.targetGuildId ?? fieldErrors.targetChannelId}
              </p>
            )}

            <PublishTargetPicker
              accessToken={accessToken}
              guildId={guildId}
              guildName={guildName}
              channelId={channelId}
              lockGuild={lockGuild}
              lockChannel={lockChannel}
              onGuildChange={onGuildChange}
              onChannelChange={onChannelChange}
            />
          </>
        )}
      </FormSection>

      {!devPreview && canRank ? (
        <FormSection title={t('create.rankedSection')}>
          <label className={toggleRowClass}>
            <span className="text-sm text-slate-300">{t('create.rankedToggle')}</span>
            <input
              type="checkbox"
              checked={isRanked}
              disabled={lockRanked}
              onChange={(e) => onIsRankedChange(e.target.checked)}
              className="h-4 w-4 accent-white"
            />
          </label>
          {lockRanked ? (
            <p className="mt-1.5 text-xs text-muted">{t('create.rankedLocked')}</p>
          ) : null}
        </FormSection>
      ) : null}

      {!devPreview && <CreateEventConvoySection {...convoy} />}
    </div>
  );
}
