import {Trans, useTranslation} from 'react-i18next';
import {PublishTargetPicker} from '../../../components/PublishTargetPicker';
import {Alert} from '../../../components/ui/Alert';
import {TextButton} from '../../../components/ui/TextButton';
import {
  CreateEventConvoySection,
  type CreateEventConvoySectionProps,
} from '../components/CreateEventConvoySection';
import {FormSection} from '../components/Field';
import {isLocalDevHost} from '../../../lib/runtime';
import type {PublishGap} from '../publishGaps';
import {PUBLISH_STEP_INDEX, type CreateEventStepIndex} from '../constants';
import type {FieldErrors} from '../types';

type Props = {
  token: string | null;
  accessToken: string;
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
