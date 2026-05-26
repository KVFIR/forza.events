import {cn} from '../../../lib/cn';
import {TITLE_MAX_LENGTH, EVENT_TYPES, formInput, COVER_ACCEPT} from '../constants';
import {Divider, Field, fieldInputClass} from '../components/Field';
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
        <input
          id="create-title"
          className={cn(formInput, fieldInputClass(Boolean(fieldErrors.title)))}
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
        <div
          className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 sm:grid-cols-3"
          role="group"
          aria-label="Event type"
          aria-invalid={Boolean(fieldErrors.type)}
        >
          {EVENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onType(t.value)}
              aria-pressed={values.type === t.value}
              className={cn(
                'rounded-md px-2 py-2 text-[11px] font-semibold leading-tight transition-colors duration-150',
                values.type === t.value
                  ? t.typeButtonSelected
                  : 'text-muted hover:text-slate-300',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field
        title="Date & time"
        htmlFor="create-startsAtLocal"
        error={fieldErrors.startsAtLocal}
        hint="Shown in your local timezone."
      >
        <input
          id="create-startsAtLocal"
          type="datetime-local"
          className={cn(
            formInput,
            '[color-scheme:dark]',
            fieldInputClass(Boolean(fieldErrors.startsAtLocal)),
          )}
          value={values.startsAtLocal}
          onChange={(e) => onStartsAtLocal(e.target.value)}
          aria-invalid={Boolean(fieldErrors.startsAtLocal)}
          aria-describedby={
            fieldErrors.startsAtLocal ? 'create-startsAtLocal-error' : undefined
          }
        />
      </Field>

      <Field title="Description" htmlFor="create-description">
        <textarea
          id="create-description"
          rows={3}
          className={cn(formInput, 'resize-none')}
          value={values.description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="Optional — rules, meetup spot, voice channel notes"
        />
      </Field>

      <Field title="Cover image" error={fieldErrors.cover}>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/[0.1] px-4 py-3 text-sm text-muted transition-colors hover:border-white/20 hover:text-slate-300">
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
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
          <span className="text-sm text-slate-300">I am the convoy leader</span>
          <input
            type="checkbox"
            checked={lobbyLeaderIsHost}
            onChange={(e) => onLobbyLeaderIsHost(e.target.checked)}
            className="h-4 w-4 accent-white"
          />
        </label>
        {lobbyLeaderIsHost && !hasGamertag(hostGamertag) && (
          <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Add your Xbox gamertag in Profile before publishing, or enter another convoy leader below.
          </p>
        )}
        {!lobbyLeaderIsHost && (
          <input
            id="create-lobbyLeaderGamertag"
            className={cn(
              formInput,
              'mt-2',
              fieldInputClass(Boolean(fieldErrors.lobbyLeaderGamertag)),
            )}
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
