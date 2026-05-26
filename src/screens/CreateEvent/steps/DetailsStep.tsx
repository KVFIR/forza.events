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
  return (
    <div className="space-y-6">
      <EventTrackCodeList
        codes={trackCodes}
        onChange={onTrackCodes}
        inputClass={formInput}
        labelClass={formLabel}
      />
      <p className="-mt-4 text-xs text-muted">Optional — add track share codes for the route list.</p>

      <Divider />

      <Field title="Car rules">
        <SegmentGroup
          value={carRuleMode}
          onChange={onCarRuleMode}
          ariaLabel="Car rules"
          itemClassName="py-1.5 text-xs"
          options={[
            {value: 'anything_goes', label: 'Open build'},
            {value: 'restricted_list', label: 'Restricted list'},
          ]}
        />
        <p className="mt-2 text-xs text-muted">
          Open build lets you set a PI cap and optional category notes instead of a fixed car list.
        </p>
      </Field>

      {carRuleMode === 'anything_goes' ? (
        <div className="space-y-3">
          <Field title="Max PI" htmlFor="create-maxPi" error={fieldErrors.maxPi}>
            <MaxPiInput
              id="create-maxPi"
              value={maxPi}
              onChange={onMaxPi}
              error={Boolean(fieldErrors.maxPi)}
              inputClass={formInput}
            />
          </Field>

          <Field title="Additional restrictions" htmlFor="create-additionalCarRestrictions">
            <Textarea
              id="create-additionalCarRestrictions"
              rows={3}
              value={additionalCarRestrictions}
              onChange={(e) => onAdditionalCarRestrictions(e.target.value)}
              placeholder="Optional, e.g. Super Saloons or Modern Muscle"
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
