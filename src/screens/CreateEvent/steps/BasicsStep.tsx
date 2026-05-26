import {useTranslation} from 'react-i18next';
import {Input} from '../../../components/ui/Input';
import {SegmentGroup} from '../../../components/ui/SegmentGroup';
import {Textarea} from '../../../components/ui/Textarea';
import {fileUploadLabelClass} from '../../../components/ui/formStyles';
import {eventTypeLabel} from '../../../lib/eventTypes';
import {TITLE_MAX_LENGTH, EVENT_TYPES, COVER_ACCEPT} from '../constants';
import {Field} from '../components/Field';
import {EventCover} from '../../../components/EventCover';
import type {CreateEventFormValues, FieldErrors} from '../types';
import type {EventType} from '../../../lib/types';

type Props = {
  values: CreateEventFormValues;
  fieldErrors: FieldErrors;
  onTitle: (v: string) => void;
  onType: (v: EventType) => void;
  onStartsAtLocal: (v: string) => void;
  onDescription: (v: string) => void;
  onCoverChange: (file: File | null) => void;
};

export function BasicsStep({
  values,
  fieldErrors,
  onTitle,
  onType,
  onStartsAtLocal,
  onDescription,
  onCoverChange,
}: Props) {
  const {t} = useTranslation();
  const titleLen = values.title.length;

  return (
    <div className="space-y-5">
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
        hint="Shown in your local timezone."
      >
        <Input
          id="create-startsAtLocal"
          type="datetime-local"
          invalid={Boolean(fieldErrors.startsAtLocal)}
          className="[color-scheme:dark]"
          value={values.startsAtLocal}
          onChange={(e) => onStartsAtLocal(e.target.value)}
          aria-invalid={Boolean(fieldErrors.startsAtLocal)}
          aria-describedby={
            fieldErrors.startsAtLocal ? 'create-startsAtLocal-error' : undefined
          }
        />
      </Field>

      <Field
        title={t('create.description')}
        htmlFor="create-description"
      >
        <Textarea
          id="create-description"
          rows={3}
          value={values.description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder={t('create.descriptionPlaceholder')}
        />
      </Field>

      <Field title={t('create.coverImage')} error={fieldErrors.cover}>
        <label className={fileUploadLabelClass}>
          <span>{values.coverFile ? values.coverFile.name : 'Choose file (max 2 MB)'}</span>
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
            className="mt-2 aspect-video w-full rounded-lg"
            alt="Cover preview"
          />
        )}
        <p className="mt-1.5 text-xs text-muted">
          Optional — a default cover is used by event type. JPEG, PNG, or WebP, max 2 MB.
        </p>
      </Field>
    </div>
  );
}
