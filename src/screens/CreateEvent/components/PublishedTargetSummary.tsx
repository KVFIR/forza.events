import {useTranslation} from 'react-i18next';
import {FormSection} from './Field';
import {checkboxHintRowClass} from '../../../components/ui/formStyles';
import type {CreateEventType} from '../types';

type Props = {
  guildName: string;
  hasChannel: boolean;
  eventType: CreateEventType;
  isRanked: boolean;
  targetGuildRatingEnabled: boolean;
  onIsRankedChange: (v: boolean) => void;
};

export function PublishedTargetSummary({
  guildName,
  hasChannel,
  eventType,
  isRanked,
  targetGuildRatingEnabled,
  onIsRankedChange,
}: Props) {
  const {t} = useTranslation();
  const canRank =
    targetGuildRatingEnabled && (eventType === 'road' || eventType === 'dirt');

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

      {canRank ? (
        <FormSection title={t('create.rankedSection')}>
          <label className={checkboxHintRowClass}>
            <input
              type="checkbox"
              checked={isRanked}
              onChange={(e) => onIsRankedChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-white"
              aria-label={t('create.rankedToggle')}
            />
            <span className="min-w-0 text-xs text-muted">{t('create.rankedHint')}</span>
          </label>
        </FormSection>
      ) : null}
    </div>
  );
}
