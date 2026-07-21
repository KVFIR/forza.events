import {useTranslation} from 'react-i18next';
import {FormSection} from './Field';
import {toggleRowClass} from '../../../components/ui/formStyles';
import type {CreateEventType} from '../types';

type Props = {
  guildName: string;
  hasChannel: boolean;
  eventType: CreateEventType;
  isRanked: boolean;
  targetGuildRatingEnabled: boolean;
};

/** Published target is locked; ranked is display-only after publish. */
export function PublishedTargetSummary({
  guildName,
  hasChannel,
  eventType,
  isRanked,
  targetGuildRatingEnabled,
}: Props) {
  const {t} = useTranslation();
  const showRanked =
    isRanked ||
    (targetGuildRatingEnabled && (eventType === 'road' || eventType === 'dirt'));

  return (
    <div className="space-y-3">
      <FormSection title={t('create.publishTarget')}>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t('create.server')}</dt>
            <dd className="text-right text-slate-200">{guildName || t('common.notSet')}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t('create.channel')}</dt>
            <dd className="text-right text-slate-200">
              {hasChannel ? t('create.channelSet') : t('common.notSet')}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted">{t('create.publishedTargetLocked')}</p>
      </FormSection>

      {showRanked ? (
        <FormSection title={t('create.rankedSection')}>
          <label className={toggleRowClass}>
            <span className="text-sm text-slate-300">{t('create.rankedToggle')}</span>
            <input
              type="checkbox"
              checked={isRanked}
              disabled
              className="h-4 w-4 accent-white"
              aria-label={t('create.rankedToggle')}
            />
          </label>
          <p className="mt-1.5 text-xs text-muted">{t('create.rankedLocked')}</p>
        </FormSection>
      ) : null}
    </div>
  );
}
