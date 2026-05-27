import {useTranslation} from 'react-i18next';
import {Input} from '../../../components/ui/Input';
import {SegmentGroup} from '../../../components/ui/SegmentGroup';
import {Textarea} from '../../../components/ui/Textarea';
import {Alert} from '../../../components/ui/Alert';
import {TextButton} from '../../../components/ui/TextButton';
import {fileUploadLabelClass, toggleRowClass} from '../../../components/ui/formStyles';
import {eventTypeLabel} from '../../../lib/eventTypes';
import {COVER_ASPECT_CLASS} from '../../../lib/coverImage';
import {hasGamertag} from '../../../lib/gamertag';
import {datetimeLocalInputBounds} from '../../../lib/datetime';
import {TITLE_MAX_LENGTH, EVENT_TYPES, COVER_ACCEPT, formInput, formLabel} from '../constants';
import {Field, FormSection} from '../components/Field';
import {EventCover} from '../../../components/EventCover';
import {EventTrackList} from '../../../components/EventTrackList';
import {EventCarList, type EventCarEntry} from '../../../components/EventCarList';
import {MaxPiInput} from '../../../components/MaxPiInput';
import {ConvoyLeaderPicker, type ConvoyLeaderSelection} from '../../../components/ConvoyLeaderPicker';
import {cn} from '../../../lib/cn';
import {fieldErrorClass} from '../../../components/ui/formStyles';
import type {CreateEventFormValues, FieldErrors} from '../types';
import type {CarRuleMode, EventType} from '../../../lib/types';

type Props = {
  values: CreateEventFormValues;
  fieldErrors: FieldErrors;
  token: string | null;
  hostDiscordId: string;
  hostGamertag?: string;
  lobbyLeaderSelection: ConvoyLeaderSelection | null;
  onTitle: (v: string) => void;
  onType: (v: EventType) => void;
  onStartsAtLocal: (v: string) => void;
  onDescription: (v: string) => void;
  onCoverChange: (file: File | null) => void;
  onTracks: (tracks: CreateEventFormValues['tracks']) => void;
  onCarRuleMode: (mode: CarRuleMode) => void;
  onMaxPi: (n: number) => void;
  onAdditionalCarRestrictions: (v: string) => void;
  onEventCars: (cars: EventCarEntry[]) => void;
  onLobbyLeaderIsHost: (v: boolean) => void;
  onLobbyLeaderGamertag: (v: string) => void;
  onLobbyLeaderSelect: (member: ConvoyLeaderSelection | null) => void;
  onAddHostGamertag?: () => void;
};

export function EventStep({
  values,
  fieldErrors,
  token,
  hostDiscordId,
  hostGamertag,
  lobbyLeaderSelection,
  onTitle,
  onType,
  onStartsAtLocal,
  onDescription,
  onCoverChange,
  onTracks,
  onCarRuleMode,
  onMaxPi,
  onAdditionalCarRestrictions,
  onEventCars,
  onLobbyLeaderIsHost,
  onLobbyLeaderGamertag,
  onLobbyLeaderSelect,
  onAddHostGamertag,
}: Props) {
  const {t} = useTranslation();
  const titleLen = values.title.length;
  const {min: startsAtMin, max: startsAtMax} = datetimeLocalInputBounds();

  return (
    <div className="space-y-3">
      <FormSection title={t('create.sectionBasics')}>
        <Field title={t('create.eventName')} htmlFor="create-title" error={fieldErrors.title}>
          <Input
            id="create-title"
            invalid={Boolean(fieldErrors.title)}
            value={values.title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder={t('create.eventNamePlaceholder')}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'create-title-error' : undefined}
          />
          <p className="mt-1 text-right text-[10px] tabular-nums text-muted">
            {titleLen}/{TITLE_MAX_LENGTH}
          </p>
        </Field>

        <Field title={t('create.type')} error={fieldErrors.type}>
          <SegmentGroup
            value={values.type}
            onChange={onType}
            ariaLabel={t('create.type')}
            invalid={Boolean(fieldErrors.type)}
            layout="grid"
            containerClassName="grid-cols-2 sm:grid-cols-3"
            itemClassName="px-2 py-2 text-[11px] leading-tight"
            options={EVENT_TYPES.map((et) => ({
              value: et.value,
              label: eventTypeLabel(et.value),
              selectedClassName: et.typeButtonSelected,
            }))}
          />
        </Field>

        <Field
          title={t('create.dateTime')}
          htmlFor="create-startsAtLocal"
          error={fieldErrors.startsAtLocal}
        >
          <Input
            id="create-startsAtLocal"
            type="datetime-local"
            min={startsAtMin}
            max={startsAtMax}
            invalid={Boolean(fieldErrors.startsAtLocal)}
            className="[color-scheme:dark]"
            value={values.startsAtLocal}
            onChange={(e) => onStartsAtLocal(e.target.value)}
            onBlur={(e) => onStartsAtLocal(e.target.value)}
            aria-invalid={Boolean(fieldErrors.startsAtLocal)}
            aria-describedby={
              fieldErrors.startsAtLocal ? 'create-startsAtLocal-error' : undefined
            }
          />
        </Field>
      </FormSection>

      <FormSection title={t('create.sectionAbout')}>
        <Field title={t('create.description')} htmlFor="create-description" optional>
          <Textarea
            id="create-description"
            rows={3}
            value={values.description}
            onChange={(e) => onDescription(e.target.value)}
            placeholder={t('create.descriptionPlaceholder')}
          />
        </Field>

        <Field title={t('create.coverImage')} error={fieldErrors.cover} optional>
          <label className={fileUploadLabelClass}>
            <span>
              {values.coverFile ? values.coverFile.name : t('create.coverChooseFile')}
            </span>
            <input
              type="file"
              accept={COVER_ACCEPT}
              className="sr-only"
              onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {values.coverPreview && (
            <EventCover
              src={values.coverPreview}
              variant="preview"
              className={`mt-2 ${COVER_ASPECT_CLASS} w-full rounded-lg`}
              alt={t('create.coverPreviewAlt')}
            />
          )}
        </Field>
      </FormSection>

      <FormSection title={t('create.sectionRace')}>
        <EventTrackList
          tracks={values.tracks}
          onChange={onTracks}
          inputClass={formInput}
          labelClass={formLabel}
        />
        {fieldErrors.tracks ? (
          <p className={fieldErrorClass}>{fieldErrors.tracks}</p>
        ) : null}

        <Field title={t('create.carRules')}>
          <SegmentGroup
            value={values.carRuleMode}
            onChange={onCarRuleMode}
            ariaLabel={t('create.carRules')}
            itemClassName="py-1.5 text-xs"
            options={[
              {value: 'anything_goes', label: t('create.openBuildOption')},
              {value: 'restricted_list', label: t('create.restrictedListOption')},
            ]}
          />
        </Field>

        {values.carRuleMode === 'anything_goes' ? (
          <div className="space-y-3">
            <Field title={t('create.maxPi')} htmlFor="create-maxPi" error={fieldErrors.maxPi}>
              <MaxPiInput
                id="create-maxPi"
                value={values.maxPi}
                onChange={onMaxPi}
                error={Boolean(fieldErrors.maxPi)}
                inputClass={formInput}
              />
            </Field>
            <Field
              title={t('create.additionalRestrictions')}
              htmlFor="create-additionalCarRestrictions"
              optional
            >
              <Textarea
                id="create-additionalCarRestrictions"
                rows={2}
                value={values.additionalCarRestrictions}
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
              cars={values.eventCars}
              onChange={onEventCars}
              inputClass={formInput}
              labelClass={formLabel}
            />
          </div>
        )}
      </FormSection>

      <FormSection title={t('create.sectionConvoy')}>
        <label className={toggleRowClass}>
          <span className="text-sm text-slate-300">{t('create.iAmConvoyLeader')}</span>
          <input
            type="checkbox"
            checked={values.lobbyLeaderIsHost}
            onChange={(e) => onLobbyLeaderIsHost(e.target.checked)}
            className="h-4 w-4 accent-white"
          />
        </label>
        {values.lobbyLeaderIsHost && !hasGamertag(hostGamertag) && (
          <Alert variant="warning">
            <p>{t('create.convoyLeaderProfileWarning')}</p>
            {onAddHostGamertag ? (
              <TextButton type="button" className="mt-2" onClick={onAddHostGamertag}>
                {t('profile.addGamertag')}
              </TextButton>
            ) : null}
          </Alert>
        )}
        {!values.lobbyLeaderIsHost && token && (
          <ConvoyLeaderPicker
            accessToken={token}
            guildId={values.targetGuildId}
            hostDiscordId={hostDiscordId}
            selected={lobbyLeaderSelection}
            gamertag={values.lobbyLeaderGamertag}
            onSelect={onLobbyLeaderSelect}
            onGamertagChange={onLobbyLeaderGamertag}
            invalid={Boolean(
              fieldErrors.lobbyLeaderGamertag || fieldErrors.lobbyLeaderDiscordId,
            )}
            error={
              fieldErrors.lobbyLeaderDiscordId ?? fieldErrors.lobbyLeaderGamertag ?? null
            }
          />
        )}
        {!values.lobbyLeaderIsHost && !token && (
          <p className="text-xs text-muted">{t('auth.openInDiscordTarget')}</p>
        )}
        {!values.lobbyLeaderIsHost && token && !values.targetGuildId && (
          <p className="text-xs text-muted">{t('create.convoyLeaderPickServerOnPublish')}</p>
        )}
      </FormSection>
    </div>
  );
}
