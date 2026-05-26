import {useTranslation} from 'react-i18next';
import {cn} from '../../../lib/cn';
import {Alert} from '../../../components/ui/Alert';
import {Input} from '../../../components/ui/Input';
import {SegmentGroup} from '../../../components/ui/SegmentGroup';
import {Textarea} from '../../../components/ui/Textarea';
import {fieldErrorClass, toggleRowClass} from '../../../components/ui/formStyles';
import {hasGamertag} from '../../../lib/gamertag';
import {MaxPiInput} from '../../../components/MaxPiInput';
import type {CarRuleMode} from '../../../lib/types';
import {EventCarList, type EventCarEntry} from '../../../components/EventCarList';
import {EventTrackCodeList} from '../../../components/EventTrackCodeList';
import {formInput, formLabel} from '../constants';
import {Divider, Field} from '../components/Field';
import type {FieldErrors} from '../types';

type Props = {
  hostGamertag?: string;
  lobbyLeaderIsHost: boolean;
  lobbyLeaderGamertag: string;
  onLobbyLeaderIsHost: (v: boolean) => void;
  onLobbyLeaderGamertag: (v: string) => void;
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
  hostGamertag,
  lobbyLeaderIsHost,
  lobbyLeaderGamertag,
  onLobbyLeaderIsHost,
  onLobbyLeaderGamertag,
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
      <Field
        title={t('create.convoyLeader')}
        htmlFor={lobbyLeaderIsHost ? undefined : 'create-lobbyLeaderGamertag'}
        error={fieldErrors.lobbyLeaderGamertag}
        hint={t('create.convoyLeaderHint')}
      >
        <label className={toggleRowClass}>
          <span className="text-sm text-slate-300">{t('create.iAmConvoyLeader')}</span>
          <input
            type="checkbox"
            checked={lobbyLeaderIsHost}
            onChange={(e) => onLobbyLeaderIsHost(e.target.checked)}
            className="h-4 w-4 accent-white"
          />
        </label>
        {lobbyLeaderIsHost && !hasGamertag(hostGamertag) && (
          <Alert variant="warning" className="mt-2">
            {t('create.convoyLeaderProfileWarning')}
          </Alert>
        )}
        {!lobbyLeaderIsHost && (
          <Input
            id="create-lobbyLeaderGamertag"
            className="mt-2"
            invalid={Boolean(fieldErrors.lobbyLeaderGamertag)}
            placeholder={t('create.xboxGamertag')}
            value={lobbyLeaderGamertag}
            onChange={(e) => onLobbyLeaderGamertag(e.target.value)}
            maxLength={15}
            aria-invalid={Boolean(fieldErrors.lobbyLeaderGamertag)}
            aria-describedby={
              fieldErrors.lobbyLeaderGamertag ? 'create-lobbyLeaderGamertag-error' : undefined
            }
          />
        )}
      </Field>

      <Divider />

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
