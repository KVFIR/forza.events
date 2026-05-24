import {RuleListInput} from './RuleListInput';
import {TUNING_RESTRICTION_TEMPLATES} from '../lib/tuning';

type Props = {
  items: string[];
  onChange: (items: string[]) => void;
};

export function TuningRestrictionsInput({items, onChange}: Props) {
  return (
    <RuleListInput
      label="Tuning & parts restrictions"
      items={items}
      onChange={onChange}
      templates={[...TUNING_RESTRICTION_TEMPLATES]}
    />
  );
}
