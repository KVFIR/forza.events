import {OPEN_IN_APP_BUTTON_LABEL} from './embedJoin.ts';
import {openEventCustomId} from './eventLaunch.ts';

export const VIEW_RESULTS_BUTTON_PREFIX = 'view_results:';
export const VIEW_RESULTS_BUTTON_LABEL = 'View results';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTENT_MAX = 2000;
const EPHEMERAL = 64;
const INTERACTION_MSG = 4;
const MORE = '\n_…open in FORZA.EVENTS for the rest._';

export type EmbedResultLine = {
  discord_id: string;
  position: number | null;
  dnf?: boolean | null;
  dns?: boolean | null;
  points?: number | null;
  group_index?: number | null;
  label: string;
  ratingDelta?: number | null;
};

export function viewResultsCustomId(eventId: string): string {
  return `${VIEW_RESULTS_BUTTON_PREFIX}${eventId}`;
}

export function eventIdFromViewResultsCustomId(
  customId: string | null | undefined,
): string | null {
  if (!customId) return null;
  if (customId.startsWith(VIEW_RESULTS_BUTTON_PREFIX)) {
    const id = customId.slice(VIEW_RESULTS_BUTTON_PREFIX.length).trim();
    return UUID_RE.test(id) ? id : null;
  }
  if (!customId.startsWith('open_event:')) return null;
  const [id, suffix] = customId.slice('open_event:'.length).trim().split(':');
  return suffix === 'results' && id && UUID_RE.test(id) ? id : null;
}

function isFinisher(row: EmbedResultLine): boolean {
  return !row.dnf && !row.dns && row.position != null;
}

function sortRows(rows: EmbedResultLine[]): EmbedResultLine[] {
  return [...rows].sort((a, b) => {
    const aOk = isFinisher(a);
    const bOk = isFinisher(b);
    if (aOk && bOk) return (a.position as number) - (b.position as number);
    if (aOk) return -1;
    if (bOk) return 1;
    return 0;
  });
}

function resultsLayout(rows: EmbedResultLine[]): 'per_group' | 'overall' {
  const finishers = rows.filter((row) => row.position != null);
  const groups = new Set(finishers.map((row) => row.group_index ?? 1));
  if (groups.size <= 1) return 'per_group';
  const positions = finishers.map((row) => row.position as number);
  return new Set(positions).size < positions.length ? 'per_group' : 'overall';
}

function finishTag(row: EmbedResultLine): string {
  if (row.dns) return 'DNS';
  if (row.dnf) return 'DNF';
  if (row.position != null) return String(row.position);
  return '—';
}

function formatLine(row: EmbedResultLine): string {
  const extras: string[] = [];
  if (row.points != null) extras.push(`${row.points} pts`);
  if (row.ratingDelta != null && row.ratingDelta !== 0) {
    extras.push(row.ratingDelta > 0 ? `+${row.ratingDelta}` : String(row.ratingDelta));
  }
  const tail = extras.length ? ` ${extras.join(' ')}` : '';
  return `\`${finishTag(row)}\` ${row.label}${tail}`;
}

function clip(text: string): string {
  if (text.length <= CONTENT_MAX) return text;
  const keep = CONTENT_MAX - MORE.length;
  return `${text.slice(0, Math.max(0, keep)).trimEnd()}${MORE}`;
}

export function formatEmbedResultsContent(input: {
  title: string;
  type: string;
  rows: EmbedResultLine[];
}): string {
  const title = input.title.trim() || 'Event';
  const head = `**${title}**`;
  if (input.type === 'cruise') {
    return clip(`${head}\nCruises don't have race results.`);
  }
  if (input.rows.length === 0) {
    return clip(`${head}\nResults aren't in yet.`);
  }

  const rows = sortRows(input.rows);
  const layout = resultsLayout(rows);
  const groups = new Set(rows.map((row) => row.group_index ?? 1));
  const byConvoy = layout === 'per_group' && groups.size > 1;

  const blocks: string[] = [head];
  if (!byConvoy) {
    blocks.push(rows.map(formatLine).join('\n'));
    return clip(blocks.join('\n'));
  }

  for (const group of [...groups].sort((a, b) => a - b)) {
    const inGroup = rows.filter((row) => (row.group_index ?? 1) === group);
    if (!inGroup.length) continue;
    blocks.push(`**Convoy ${group}**\n${inGroup.map(formatLine).join('\n')}`);
  }
  return clip(blocks.join('\n\n'));
}

export function viewResultsInteractionResponse(
  content: string,
  eventId: string,
): {type: number; data: Record<string, unknown>} {
  return {
    type: INTERACTION_MSG,
    data: {
      flags: EPHEMERAL,
      content,
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: OPEN_IN_APP_BUTTON_LABEL,
              custom_id: openEventCustomId(eventId),
            },
          ],
        },
      ],
    },
  };
}
