import {cn} from '../../../lib/cn';
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
      <p className="-mt-4 text-xs text-muted">At least one track code is required to publish.</p>

      <Divider />

      <Field title="Car rules">
        <div
          className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5"
          role="group"
          aria-label="Car rules"
        >
          {(['anything_goes', 'restricted_list'] as CarRuleMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onCarRuleMode(mode)}
              aria-pressed={carRuleMode === mode}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors duration-150',
                carRuleMode === mode
                  ? 'bg-white/[0.1] text-white'
                  : 'text-muted hover:text-slate-300',
              )}
            >
              {mode === 'anything_goes' ? 'Open build' : 'Restricted list'}
            </button>
          ))}
        </div>
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
            <textarea
              id="create-additionalCarRestrictions"
              rows={3}
              className={cn(formInput, 'resize-none')}
              value={additionalCarRestrictions}
              onChange={(e) => onAdditionalCarRestrictions(e.target.value)}
              placeholder="Optional, e.g. Super Saloons or Modern Muscle"
            />
          </Field>
        </div>
      ) : (
        <div>
          {fieldErrors.eventCars && (
            <p role="alert" className="mb-2 text-xs text-red-300/90">
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
