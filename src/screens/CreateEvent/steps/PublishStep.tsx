import {useTranslation} from 'react-i18next';
import {PublishTargetPicker} from '../../../components/PublishTargetPicker';
import {
  CreateEventConvoySection,
  type CreateEventConvoySectionProps,
} from '../components/CreateEventConvoySection';
import {FormSection} from '../components/Field';
import {isLocalDevHost} from '../../../lib/runtime';
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
  convoy: CreateEventConvoySectionProps;
  onGuildChange: (id: string, name: string) => void;
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
  onGuildChange,
  onChannelChange,
}: Props) {
  const {t} = useTranslation();
  const devPreview = isLocalDevHost() && !token;

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

      {!devPreview && <CreateEventConvoySection {...convoy} />}
    </div>
  );
}
