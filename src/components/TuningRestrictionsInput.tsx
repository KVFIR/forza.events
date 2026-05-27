import {useTranslation} from 'react-i18next';
import {RuleListInput} from './RuleListInput';
import {TUNING_RESTRICTION_TEMPLATE_KEYS} from '../lib/tuning';

type Props = {
  items: string[];
  onChange: (items: string[]) => void;
};

export function TuningRestrictionsInput({items, onChange}: Props) {
  const {t} = useTranslation();
  return (
    <RuleListInput
      label={t('create.tuningRestrictions')}
      items={items}
      onChange={onChange}
      templates={TUNING_RESTRICTION_TEMPLATE_KEYS.map((key) =>
        t(`create.tuningTemplates.${key}`),
      )}
      customRulePlaceholder={t('create.customRulePlaceholder')}
    />
  );
}
