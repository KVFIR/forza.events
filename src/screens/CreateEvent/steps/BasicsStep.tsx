import {Alert} from '../../../components/ui/Alert';
import {Input} from '../../../components/ui/Input';
import {SegmentGroup} from '../../../components/ui/SegmentGroup';
import {Textarea} from '../../../components/ui/Textarea';
import {fileUploadLabelClass, toggleRowClass} from '../../../components/ui/formStyles';
import {TITLE_MAX_LENGTH, EVENT_TYPES, COVER_ACCEPT} from '../constants';
import {Divider, Field} from '../components/Field';
import {EventCover} from '../../../components/EventCover';
import type {CreateEventFormValues, FieldErrors} from '../types';
import {hasGamertag} from '../../../lib/gamertag';
import type {EventType} from '../../../lib/types';

type Props = {
  values: CreateEventFormValues;
  hostGamertag?: string;
  fieldErrors: FieldErrors;
  onTitle: (v: string) => void;
  onType: (v: EventType) => void;
  onStartsAtLocal: (v: string) => void;
  onDescription: (v: string) => void;
  onCoverChange: (file: File | null) => void;
  lobbyLeaderIsHost: boolean;
  onLobbyLeaderIsHost: (v: boolean) => void;
  onLobbyLeaderGamertag: (v: string) => void;
};

export function BasicsStep({
  values,
  hostGamertag,
  fieldErrors,
  onTitle,
  onType,
  onStartsAtLocal,
  onDescription,
  onCoverChange,
  lobbyLeaderIsHost,
  onLobbyLeaderIsHost,
  onLobbyLeaderGamertag,
}: Props) {
  const titleLen = values.title.length;

  return (
    <div className="space-y-5">
      <Field title="Event name" htmlFor="create-title" error={fieldErrors.title}>
        <Input
          id="create-title"
          invalid={Boolean(fieldErrors.title)}
          value={values.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Name your event"
          maxLength={TITLE_MAX_LENGTH}
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'create-title-error' : undefined}
        />
        <p className="mt-1 text-right text-[10px] tabular-nums text-muted">
          {titleLen}/{TITLE_MAX_LENGTH}
        </p>
      </Field>

      <Field title="Type" error={fieldErrors.type}>
        <SegmentGroup
          value={values.type}
          onChange={onType}
          ariaLabel="Event type"
          invalid={Boolean(fieldErrors.type)}
          layout="grid"
          containerClassName="grid-cols-2 sm:grid-cols-3"
          itemClassName="px-2 py-2 text-[11px] leading-tight"
          options={EVENT_TYPES.map((t) => ({
            value: t.value,
            label: t.label,
            selectedClassName: t.typeButtonSelected,
          }))}
        />
      </Field>

      <Field
        title="Date & time"
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

      <Field title="Description" htmlFor="create-description">
        <Textarea
          id="create-description"
          rows={3}
          value={values.description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="Optional — rules, meetup spot, voice channel notes"
        />
      </Field>

      <Field title="Cover image" error={fieldErrors.cover}>
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

      <Divider />

      <Field title="Convoy leader">
        <label className={toggleRowClass}>
          <span className="text-sm text-slate-300">I am the convoy leader</span>
          <input
            type="checkbox"
            checked={lobbyLeaderIsHost}
            onChange={(e) => onLobbyLeaderIsHost(e.target.checked)}
            className="h-4 w-4 accent-white"
          />
        </label>
        {lobbyLeaderIsHost && !hasGamertag(hostGamertag) && (
          <Alert variant="warning" className="mt-2">
            Add your Xbox gamertag in Profile before publishing, or enter another convoy leader below.
          </Alert>
        )}
        {!lobbyLeaderIsHost && (
          <Input
            id="create-lobbyLeaderGamertag"
            className="mt-2"
            invalid={Boolean(fieldErrors.lobbyLeaderGamertag)}
            placeholder="Gamertag"
            value={values.lobbyLeaderGamertag}
            onChange={(e) => onLobbyLeaderGamertag(e.target.value)}
            maxLength={15}
            aria-invalid={Boolean(fieldErrors.lobbyLeaderGamertag)}
            aria-describedby={
              fieldErrors.lobbyLeaderGamertag
                ? 'create-lobbyLeaderGamertag-error'
                : undefined
            }
          />
        )}
        {fieldErrors.lobbyLeaderGamertag && (
          <p id="create-lobbyLeaderGamertag-error" role="alert" className="mt-1.5 text-xs text-red-300/90">
            {fieldErrors.lobbyLeaderGamertag}
          </p>
        )}
      </Field>
    </div>
  );
}
