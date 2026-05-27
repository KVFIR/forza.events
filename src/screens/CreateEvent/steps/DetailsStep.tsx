import {useTranslation} from 'react-i18next';
import {cn} from '../../../lib/cn';
import {SegmentGroup} from '../../../components/ui/SegmentGroup';
import {Textarea} from '../../../components/ui/Textarea';
import {fieldErrorClass} from '../../../components/ui/formStyles';
import {MaxPiInput} from '../../../components/MaxPiInput';
import type {CarRuleMode} from '../../../lib/types';
import {EventCarList, type EventCarEntry} from '../../../components/EventCarList';
import {EventTrackCodeList} from '../../../components/EventTrackCodeList';
import {formInput, formLabel} from '../constants';
import {Divider, Field} from '../components/Field';
import type {FieldErrors} from '../types';

type Props = {
  trackCodes: string[];
  onTrackCodes: (codes: string[]) => void;
  carRuleMode: CarRuleMode;
  onCarRuleMode: (mode: CarRuleMode) => void;
  maxPi: number;
  onMaxPi: (n: number) => void;
  additionalCarRestrictions: string;
  onAdditionalCarRestrictions: (v: string) => void;
  eventCars: EventCarEntry[];
  onEventCars: (cars: EventCarEntry[]) => void;
  fieldErrors: FieldErrors;
};

export function DetailsStep({
  trackCodes,
  onTrackCodes,
  carRuleMode,
  onCarRuleMode,
  maxPi,
  onMaxPi,
  additionalCarRestrictions,
  onAdditionalCarRestrictions,
  eventCars,
  onEventCars,
  fieldErrors,
}: Props) {
  const {t} = useTranslation();

  return (
    <div className="space-y-6">
      <EventTrackCodeList
        codes={trackCodes}
        onChange={onTrackCodes}
        inputClass={formInput}
        labelClass={formLabel}
      />
      <p className="-mt-4 text-xs text-muted">{t('create.tracksOptionalHint')}</p>

      <Divider />

      <Field title={t('create.carRules')}>
        <SegmentGroup
          value={carRuleMode}
          onChange={onCarRuleMode}
          ariaLabel={t('create.carRules')}
          itemClassName="py-1.5 text-xs"
          options={[
            {value: 'anything_goes', label: t('create.openBuildOption')},
            {value: 'restricted_list', label: t('create.restrictedListOption')},
          ]}
        />
        <p className="mt-2 text-xs text-muted">{t('create.openBuildHint')}</p>
      </Field>

      {carRuleMode === 'anything_goes' ? (
        <div className="space-y-3">
          <Field title={t('create.maxPi')} htmlFor="create-maxPi" error={fieldErrors.maxPi}>
            <MaxPiInput
              id="create-maxPi"
              value={maxPi}
              onChange={onMaxPi}
              error={Boolean(fieldErrors.maxPi)}
              inputClass={formInput}
            />
          </Field>

          <Field title={t('create.additionalRestrictions')} htmlFor="create-additionalCarRestrictions">
            <Textarea
              id="create-additionalCarRestrictions"
              rows={3}
              value={additionalCarRestrictions}
              onChange={(e) => onAdditionalCarRestrictions(e.target.value)}
              placeholder={t('create.additionalRestrictionsPlaceholder')}
            />
          </Field>
        </div>
      ) : (
        <div>
          {fieldErrors.eventCars && (
            <p role="alert" className={cn(fieldErrorClass, 'mb-2')}>
              {fieldErrors.eventCars}
            </p>
          )}
          <EventCarList
            cars={eventCars}
            onChange={onEventCars}
            inputClass={formInput}
            labelClass={formLabel}
          />
        </div>
      )}
    </div>
  );
}
