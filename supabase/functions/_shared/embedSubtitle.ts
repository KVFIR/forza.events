import {eventGameLabelFullEn, normalizeEventGame} from './eventGames.ts';
import {eventTypeLabel} from './eventTypes.ts';

function statusBit(status: string, startsAt: string | null | undefined): string {
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'archived') return 'Archived';
  if (status === 'draft') return 'Draft';
  if (status === 'live' || status === 'checkin') return 'Live';
  if (startsAt && Date.parse(startsAt) <= Date.now()) return 'Live';
  return '';
}

/** Discord card `-#` line: status, Ranked, type, game. Omits Open. */
export function formatEmbedSubtitle(input: {
  status?: string | null;
  startsAt?: string | null;
  isRanked?: boolean | null;
  type: string;
  game?: string | null;
}): string {
  return [
    statusBit((input.status ?? '').trim(), input.startsAt),
    input.isRanked ? '★ Ranked' : '',
    eventTypeLabel(input.type),
    eventGameLabelFullEn(normalizeEventGame(input.game)),
  ]
    .filter(Boolean)
    .join(', ');
}
