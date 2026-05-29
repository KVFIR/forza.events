import {useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject} from 'react';
import {ChevronDown, ChevronUp, Trash2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import type {EventTrack} from '../lib/eventTracks';
import {MAX_EVENT_TRACKS, TRACK_NAME_MAX, emptyTrack} from '../lib/eventTracks';
import {ShareCodeInput} from './ShareCodeInput';
import {cn} from '../lib/cn';
import {Button} from './ui/Button';
import {FieldLabel} from './ui/FieldLabel';
import {Panel} from './ui/Panel';
import {useCollapseAllOnLoad} from '../hooks/useCollapseAllOnLoad';
import {mobileFormControlClass} from './ui/formStyles';

type Props = {
  tracks: EventTrack[];
  onChange: (tracks: EventTrack[]) => void;
  inputClass: string;
  labelClass: string;
  /** When set (edit flow), collapse all cards once after tracks load. */
  collapseAllKey?: string | null;
};

function syncRowIds(idsRef: MutableRefObject<string[]>, length: number) {
  while (idsRef.current.length < length) {
    idsRef.current.push(crypto.randomUUID());
  }
  if (idsRef.current.length > length) {
    idsRef.current = idsRef.current.slice(0, length);
  }
}

export function EventTrackList({
  tracks,
  onChange,
  inputClass,
  labelClass,
  collapseAllKey,
}: Props) {
  const {t} = useTranslation();
  const [draftName, setDraftName] = useState('');
  const {collapsedIds, setCollapsedIds, collapseAll} = useCollapseAllOnLoad(collapseAllKey);
  const rowIdsRef = useRef<string[]>([]);

  syncRowIds(rowIdsRef, tracks.length);

  useEffect(() => {
    if (tracks.length === 0) {
      setCollapsedIds(new Set());
      return;
    }
    collapseAll(rowIdsRef.current);
  }, [collapseAll, tracks.length, setCollapsedIds]);

  function emit(next: EventTrack[]) {
    onChange(next);
    syncRowIds(rowIdsRef, next.length);
  }

  function updateAt(index: number, patch: Partial<EventTrack>) {
    emit(tracks.map((row, i) => (i === index ? {...row, ...patch} : row)));
  }

  function removeAt(index: number) {
    const id = rowIdsRef.current[index];
    emit(tracks.filter((_, i) => i !== index));
    if (id) {
      setCollapsedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function addTrack(name: string) {
    if (tracks.length >= MAX_EVENT_TRACKS) return;
    const trimmed = name.trim().slice(0, TRACK_NAME_MAX);
    if (!trimmed) return;

    const entry: EventTrack = {...emptyTrack(), name: trimmed};
    const newId = crypto.randomUUID();
    rowIdsRef.current = [...rowIdsRef.current, newId];
    emit([...tracks, entry]);

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      for (const id of rowIdsRef.current.slice(0, -1)) next.add(id);
      next.delete(newId);
      return next;
    });
    setDraftName('');
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isCollapsed(id: string) {
    return collapsedIds.has(id);
  }

  function onDraftKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTrack(draftName);
    }
  }

  const atLimit = tracks.length >= MAX_EVENT_TRACKS;
  const canAddDraft = Boolean(draftName.trim()) && !atLimit;

  return (
    <div className="space-y-4">
      <div>
        <p className={labelClass}>{t('create.trackList')}</p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={onDraftKeyDown}
            enterKeyHint="done"
            placeholder={t('create.addTrackPlaceholder')}
            disabled={atLimit}
            maxLength={TRACK_NAME_MAX}
            className={cn(inputClass, mobileFormControlClass, 'mt-0 min-w-0 flex-1')}
          />
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            disabled={!canAddDraft}
            onClick={() => addTrack(draftName)}
            className="h-11 shrink-0 px-3 sm:px-4"
            aria-label={t('create.addTrack')}
          >
            <span className="sm:hidden">{t('create.addTrackShort')}</span>
            <span className="hidden sm:inline">{t('create.addTrack')}</span>
          </Button>
        </div>
        {atLimit ? (
          <p className="mt-1.5 text-xs text-muted">{t('create.tracksLimit', {max: MAX_EVENT_TRACKS})}</p>
        ) : null}
      </div>

      {tracks.length > 0 ? (
        <ul className="space-y-3">
          {tracks.map((track, index) => {
            const id = rowIdsRef.current[index]!;
            const collapsed = isCollapsed(id);
            const displayName = track.name.trim() || t('create.trackUntitled');

            return (
              <li key={id}>
                <Panel variant="soft" className="p-0">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={!collapsed}
                    aria-controls={`event-track-${id}-details`}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                    onClick={() => toggleCollapsed(id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCollapsed(id);
                      }
                    }}
                  >
                    <span className="shrink-0 text-muted" aria-hidden>
                      {collapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      {!collapsed ? (
                        <input
                          type="text"
                          value={track.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateAt(index, {name: e.target.value})}
                          placeholder={t('create.trackNamePlaceholder')}
                          maxLength={TRACK_NAME_MAX}
                          className={cn(
                            'w-full rounded-md border border-transparent bg-transparent px-0 py-0',
                            'text-sm font-semibold leading-tight text-white placeholder:text-muted',
                            'focus:border-white/15 focus:bg-white/[0.03] focus:px-2 focus:outline-none',
                          )}
                        />
                      ) : (
                        <p className="truncate text-sm font-semibold leading-tight text-white">
                          {displayName}
                        </p>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 !p-1.5 text-muted hover:text-accent-red"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAt(index);
                      }}
                      aria-label={t('create.removeTrack')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {!collapsed ? (
                    <div
                      id={`event-track-${id}-details`}
                      className="space-y-3 border-t border-white/5 p-4 pt-3"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div>
                        <FieldLabel className="mb-1.5 block">{t('create.trackShareCode')}</FieldLabel>
                        <ShareCodeInput
                          value={track.shareCode ?? ''}
                          onChange={(shareCode) =>
                            updateAt(index, {shareCode: shareCode || null})
                          }
                          className={cn(inputClass, mobileFormControlClass)}
                        />
                      </div>
                      <div>
                        <FieldLabel className="mb-1.5 block">{t('create.trackFormat')}</FieldLabel>
                        <input
                          type="text"
                          value={track.format ?? ''}
                          onChange={(e) => updateAt(index, {format: e.target.value || null})}
                          placeholder={t('create.trackFormatPlaceholder')}
                          enterKeyHint="done"
                          className={cn(inputClass, mobileFormControlClass)}
                          maxLength={100}
                        />
                      </div>
                    </div>
                  ) : null}
                </Panel>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
