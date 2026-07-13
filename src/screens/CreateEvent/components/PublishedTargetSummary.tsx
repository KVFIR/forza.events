import {useTranslation} from 'react-i18next';
import {FormSection} from './Field';

type Props = {
  guildName: string;
  hasChannel: boolean;
};

export function PublishedTargetSummary({guildName, hasChannel}: Props) {
  const {t} = useTranslation();

  return (
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
  );
}
