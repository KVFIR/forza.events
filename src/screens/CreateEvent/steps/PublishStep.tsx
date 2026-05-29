import {Trans, useTranslation} from 'react-i18next';
import {PublishTargetPicker} from '../../../components/PublishTargetPicker';
import {Alert} from '../../../components/ui/Alert';
import {TextButton} from '../../../components/ui/TextButton';
import {EventPublishPreviewCard} from '../components/EventPublishPreviewCard';
import {
  CreateEventConvoySection,
  type CreateEventConvoySectionProps,
} from '../components/CreateEventConvoySection';
import type {EventCarEntry} from '../../../components/EventCarList';
import {FormSection} from '../components/Field';
import {isLocalDevHost} from '../../../lib/runtime';
import type {PublishGap} from '../publishGaps';
import {PUBLISH_STEP_INDEX, type CreateEventStepIndex} from '../constants';
import type {FieldErrors} from '../types';
import type {CreateEventType} from '../types';
import type {CarRuleMode, EventTrack} from '../../../lib/types';

type Props = {
  token: string | null;
  accessToken: string;
  title: string;
  type: CreateEventType;
  description: string;
  coverPreview: string | null;
  startsAtLocal: string;
  carRuleMode: CarRuleMode;
  maxPi: number;
  additionalCarRestrictions: string;
  eventCars: EventCarEntry[];
  tracks: EventTrack[];
  lobbyLeaderLabel: string;
  guildId: string;
  guildName: string;
  channelId: string;
  lockGuild: boolean;
  lockChannel: boolean;
  fieldErrors: FieldErrors;
  missingForPublish: PublishGap[];
  convoy: CreateEventConvoySectionProps;
  onGuildChange: (id: string, name: string) => void;
  onChannelChange: (id: string) => void;
  onJumpToStep?: (step: CreateEventStepIndex) => void;
};

export function PublishStep({
  token,
  accessToken,
  title,
  type,
  description,
  coverPreview,
  startsAtLocal,
  carRuleMode,
  maxPi,
  additionalCarRestrictions,
  eventCars,
  tracks,
  lobbyLeaderLabel,
  guildId,
  guildName,
  channelId,
  lockGuild,
  lockChannel,
  fieldErrors,
  missingForPublish,
  convoy,
  onGuildChange,
  onChannelChange,
  onJumpToStep,
}: Props) {
  const {t} = useTranslation();
  const devPreview = isLocalDevHost() && !token;

  if (!token && !devPreview) {
    return <p className="text-sm text-muted">{t('auth.openInDiscordTarget')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">
          {t('create.publishPreview')}
        </h2>
        <EventPublishPreviewCard
          title={title}
          type={type}
          description={description}
          coverPreview={coverPreview}
          startsAtLocal={startsAtLocal}
          carRuleMode={carRuleMode}
          maxPi={maxPi}
          additionalCarRestrictions={additionalCarRestrictions}
          eventCars={eventCars}
          tracks={tracks}
          lobbyLeaderLabel={lobbyLeaderLabel}
        />
      </div>

      {missingForPublish.length > 0 && (
        <Alert variant="sky" title={t('create.beforePublish')} className="py-2.5">
          <ul className="space-y-2">
            {missingForPublish.map((gap) => (
              <li key={gap.message} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <Trans i18nKey={gap.message} />
                </span>
                {onJumpToStep && gap.step !== PUBLISH_STEP_INDEX ? (
                  <TextButton type="button" onClick={() => onJumpToStep(gap.step)}>
                    {t('create.fixIssue')}
                  </TextButton>
                ) : null}
              </li>
            ))}
          </ul>
        </Alert>
      )}

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

      {!devPreview && <CreateEventConvoySection {...convoy} />}
    </div>
  );
}
