import {describe, expect, it} from 'vitest';
import {
  eventIdFromViewResultsCustomId,
  formatEmbedResultsContent,
  viewResultsCustomId,
  viewResultsInteractionResponse,
} from '../supabase/functions/_shared/embedResults.ts';
import {formatEmbedSubtitle} from '../supabase/functions/_shared/embedSubtitle.ts';

const EVENT_ID = 'ca620d91-be25-4c95-b2f7-07bf365bec4f';

describe('formatEmbedSubtitle', () => {
  it('orders Completed, Ranked, type, game and omits Open', () => {
    expect(
      formatEmbedSubtitle({
        status: 'completed',
        isRanked: true,
        type: 'road',
        game: 'fh5',
      }),
    ).toBe('Completed, ★ Ranked, Road racing, Forza Horizon 5');
  });

  it('skips Open on an upcoming ranked dirt event', () => {
    expect(
      formatEmbedSubtitle({
        status: 'open',
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        isRanked: true,
        type: 'dirt',
        game: 'fh6',
      }),
    ).toBe('★ Ranked, Dirt racing, Forza Horizon 6');
  });
});

describe('view results custom ids', () => {
  it('round-trips view_results and accepts open_event :results', () => {
    expect(eventIdFromViewResultsCustomId(viewResultsCustomId(EVENT_ID))).toBe(EVENT_ID);
    expect(eventIdFromViewResultsCustomId(`open_event:${EVENT_ID}:results`)).toBe(EVENT_ID);
    expect(eventIdFromViewResultsCustomId(`open_event:${EVENT_ID}`)).toBeNull();
  });
});

describe('formatEmbedResultsContent', () => {
  it('lists overall positions when they are unique across convoys', () => {
    const text = formatEmbedResultsContent({
      title: 'Street Events 2: Rocket Bunny',
      type: 'road',
      rows: [
        {discord_id: 'a', position: 2, label: 'Two', group_index: 2},
        {discord_id: 'b', position: 1, label: 'One', group_index: 1, ratingDelta: 12},
      ],
    });
    expect(text).toBe(
      '**Street Events 2: Rocket Bunny**\n`1` One +12\n`2` Two',
    );
  });

  it('splits by convoy when two P1s exist', () => {
    const text = formatEmbedResultsContent({
      title: 'Rally',
      type: 'dirt',
      rows: [
        {discord_id: 'a', position: 1, label: 'A', group_index: 1},
        {discord_id: 'b', position: 1, label: 'B', group_index: 2, dnf: false, dns: false},
        {discord_id: 'c', position: null, label: 'C', group_index: 1, dnf: true},
      ],
    });
    expect(text).toContain('**Convoy 1**');
    expect(text).toContain('**Convoy 2**');
    expect(text).toContain('`DNF` C');
  });

  it('explains cruises and empty standings', () => {
    expect(formatEmbedResultsContent({title: 'Cruise', type: 'cruise', rows: []})).toContain(
      "Cruises don't have race results.",
    );
    expect(formatEmbedResultsContent({title: 'Night', type: 'road', rows: []})).toContain(
      "Results aren't in yet.",
    );
  });
});

describe('viewResultsInteractionResponse', () => {
  it('is ephemeral and keeps an Activity launch button', () => {
    const res = viewResultsInteractionResponse('**Night**\n`1` A', EVENT_ID);
    expect(res.data.flags).toBe(64);
    expect(res.data.content).toContain('Night');
    const button = (
      res.data.components as Array<{components: Array<{custom_id: string; label: string}>}>
    )[0]?.components[0];
    expect(button?.label).toBe('Open in FORZA.EVENTS');
    expect(button?.custom_id).toBe(`open_event:${EVENT_ID}`);
  });
});
