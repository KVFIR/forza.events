import {Trash2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import type {EventTrack} from '../lib/eventTracks';
import {MAX_EVENT_TRACKS, emptyTrack} from '../lib/eventTracks';
import {ShareCodeInput} from './ShareCodeInput';
import {cn} from '../lib/cn';
import {Button} from './ui/Button';
import {FieldLabel} from './ui/FieldLabel';

type Props = {
  tracks: EventTrack[];
  onChange: (tracks: EventTrack[]) => void;
  inputClass: string;
  labelClass: string;
};

export function EventTrackList({tracks, onChange, inputClass, labelClass}: Props) {
  const {t} = useTranslation();

  function updateAt(index: number, patch: Partial<EventTrack>) {
    const next = tracks.map((row, i) => (i === index ? {...row, ...patch} : row));
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(tracks.filter((_, i) => i !== index));
  }

  function addTrack() {
    if (tracks.length >= MAX_EVENT_TRACKS) return;
    onChange([...tracks, emptyTrack()]);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={labelClass}>{t('create.tracksLabel')}</p>
        <p className="mt-1 text-xs text-muted">{t('create.tracksOptional')}</p>
      </div>

      {tracks.length === 0 ? (
        <Button type="button" variant="secondary" size="compact" onClick={addTrack}>
          {t('create.addTrack')}
        </Button>
      ) : (
        <ol className="space-y-4">
          {tracks.map((track, index) => (
            <li
              key={index}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums text-muted">
                  {index + 1}.
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="rounded p-1 text-muted hover:bg-white/[0.06] hover:text-slate-200"
                  aria-label={t('create.removeTrack')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <FieldLabel>{t('create.trackName')}</FieldLabel>
                <input
                  type="text"
                  value={track.name}
                  onChange={(e) => updateAt(index, {name: e.target.value})}
                  placeholder={t('create.trackNamePlaceholder')}
                  className={cn(inputClass, 'mt-1')}
                  maxLength={120}
                />
              </div>

              <div>
                <FieldLabel>{t('create.trackShareCodeOptional')}</FieldLabel>
                <ShareCodeInput
                  value={track.shareCode ?? ''}
                  onChange={(shareCode) => updateAt(index, {shareCode: shareCode || null})}
                  className={cn(inputClass, 'mt-1')}
                />
              </div>

              <div>
                <FieldLabel>{t('create.trackFormat')}</FieldLabel>
                <input
                  type="text"
                  value={track.format ?? ''}
                  onChange={(e) => updateAt(index, {format: e.target.value || null})}
                  placeholder={t('create.trackFormatPlaceholder')}
                  className={cn(inputClass, 'mt-1')}
                  maxLength={100}
                />
              </div>
            </li>
          ))}

          {tracks.length < MAX_EVENT_TRACKS ? (
            <li>
              <Button type="button" variant="secondary" size="compact" onClick={addTrack}>
                {t('create.addTrack')}
              </Button>
            </li>
          ) : null}
        </ol>
      )}
    </div>
  );
}
