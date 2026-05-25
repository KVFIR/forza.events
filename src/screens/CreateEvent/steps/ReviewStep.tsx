import {EventCover} from '../../../components/EventCover';
import {defaultCoverPath} from '../../../lib/eventCovers';
import {defaultTimezone, formatEventTime, localInputToUtc} from '../../../lib/datetime';
import type {CarRuleMode, EventType} from '../../../lib/types';
import {formatMaxPi} from '../../../lib/pi';
import {EVENT_TYPES} from '../constants';

type Props = {
  title: string;
  type: EventType;
  startsAtLocal: string;
  coverPreview: string | null;
  targetGuildName: string;
  targetChannelId: string;
  normalizedTrackCodes: string[];
  carRuleMode: CarRuleMode;
  maxPi: number;
  carCount: number;
  lobbyLeaderLabel: string;
  missingForPublish: string[];
};

function ReviewRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
      <span className="uppercase tracking-widest text-muted">{label}</span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  );
}

export function ReviewStep({
  title,
  type,
  startsAtLocal,
  coverPreview,
  targetGuildName,
  targetChannelId,
  normalizedTrackCodes,
  carRuleMode,
  maxPi,
  carCount,
  lobbyLeaderLabel,
  missingForPublish,
}: Props) {
  const typeLabel = EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
  const when =
    startsAtLocal
      ? formatEventTime(localInputToUtc(startsAtLocal, defaultTimezone()), defaultTimezone())
      : null;
  const carRules =
    carRuleMode === 'anything_goes'
      ? `Open build · up to ${formatMaxPi(maxPi)}`
      : `Restricted · ${carCount} car${carCount === 1 ? '' : 's'}`;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl">
        <EventCover
          src={coverPreview ?? defaultCoverPath(type)}
          variant="preview"
          className="aspect-video w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
          <h2 className="text-lg font-black text-white">
            {title.trim() || <span className="text-white/40">Untitled event</span>}
          </h2>
          <p className="text-xs text-slate-300">{typeLabel}</p>
        </div>
      </div>

      {missingForPublish.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/90"
        >
          <p className="font-semibold text-amber-200/90">Before you publish</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {missingForPublish.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.08]">
        <ReviewRow label="When" value={when?.primary ?? '—'} />
        {when?.secondary && (
          <ReviewRow label="Your time" value={when.secondary.replace(/^Your time: /, '')} />
        )}
        <ReviewRow label="Server" value={targetGuildName || 'Not set'} />
        <ReviewRow
          label="Channel"
          value={targetChannelId ? 'Selected' : 'Choose on publish'}
        />
        <ReviewRow label="Convoy leader" value={lobbyLeaderLabel || '—'} />
        <ReviewRow
          label="Tracks"
          value={
            normalizedTrackCodes[0]
              ? `${normalizedTrackCodes[0]}${normalizedTrackCodes.length > 1 ? ` +${normalizedTrackCodes.length - 1}` : ''}`
              : '—'
          }
        />
        <ReviewRow label="Cars" value={carRules} />
      </div>
    </div>
  );
}

export function collectPublishGaps(input: {
  trackCount: number;
  channelId: string;
  carRuleMode: CarRuleMode;
  carCount: number;
}): string[] {
  const gaps: string[] = [];
  if (input.trackCount === 0) gaps.push('Add at least one track code on Details.');
  if (!input.channelId) gaps.push('Select an announcement channel on Target.');
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    gaps.push('Add cars for a restricted list on Details.');
  }
  return gaps;
}
