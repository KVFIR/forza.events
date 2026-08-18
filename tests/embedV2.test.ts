import {describe, expect, it} from 'vitest';
import {JOIN_EVENT_BUTTON_LABEL, OPEN_IN_APP_BUTTON_LABEL} from '../supabase/functions/_shared/embedJoin.ts';
import {VIEW_RESULTS_BUTTON_LABEL} from '../supabase/functions/_shared/embedResults.ts';
import {IS_COMPONENTS_V2, buildEventMessageV2} from '../supabase/functions/_shared/embedV2.ts';
import type {EmbedEventInput} from '../supabase/functions/_shared/events.ts';

const EVENT_ID = '87c1403e-730a-44cb-98f8-d0e20918bc1c';

function event(partial: Partial<EmbedEventInput> = {}): EmbedEventInput {
  return {
    id: EVENT_ID,
    slug: 'open-build-night-20260818',
    title: 'Open Build Night',
    type: 'road',
    game: 'fh5',
    status: 'open',
    starts_at: new Date(Date.now() + 3_600_000).toISOString(),
    max_players: 12,
    current_players: 2,
    max_pi: 650,
    car_rule_mode: 'anything_goes',
    lobby_leader_gamertag: 'FORZA.EVENTS',
    is_ranked: true,
    ...partial,
  };
}

function accessories(node: unknown, found: Array<{label?: string; custom_id?: string}> = []) {
  if (!node || typeof node !== 'object') return found;
  const rec = node as {accessory?: {label?: string; custom_id?: string}; components?: unknown[]};
  if (rec.accessory) found.push(rec.accessory);
  for (const child of rec.components ?? []) accessories(child, found);
  return found;
}

describe('buildEventMessageV2', () => {
  it('posts a V2 container with Join on the title and Open on participants', () => {
    const payload = buildEventMessageV2(event());
    expect(payload.flags).toBe(IS_COMPONENTS_V2);
    expect(payload.components[0]?.type).toBe(17);
    const buttons = accessories(payload);
    expect(buttons.map((b) => b.label)).toEqual([
      JOIN_EVENT_BUTTON_LABEL,
      OPEN_IN_APP_BUTTON_LABEL,
    ]);
    expect(buttons[0]?.custom_id).toBe(`join_event:${EVENT_ID}`);
    expect(buttons[1]?.custom_id).toBe(`open_event:${EVENT_ID}`);
    expect(JSON.stringify(payload)).toContain('★ Ranked, Road racing, Forza Horizon 5');
    expect(JSON.stringify(payload)).toContain('🚗 **Cars**');
    expect(JSON.stringify(payload)).not.toContain('"type":1,');
  });

  it('puts View results on a completed card and omits Join', () => {
    const payload = buildEventMessageV2(event({status: 'completed', starts_at: '2020-01-01T00:00:00.000Z'}));
    const buttons = accessories(payload);
    expect(buttons.map((b) => b.label)).toEqual([
      VIEW_RESULTS_BUTTON_LABEL,
      OPEN_IN_APP_BUTTON_LABEL,
    ]);
    expect(buttons[0]?.custom_id).toBe(`view_results:${EVENT_ID}`);
    expect(JSON.stringify(payload)).toContain('Completed, ★ Ranked, Road racing, Forza Horizon 5');
    expect(payload.components[0]?.accent_color).toBe(0x374151);
  });

  it('does not wrap a title that would break the markdown link', () => {
    const payload = buildEventMessageV2(event({title: 'Night [beta]'}));
    expect(JSON.stringify(payload)).toContain('# Night [beta]');
    expect(JSON.stringify(payload)).not.toContain('[Night [beta]](');
  });

  it('does not offer Join after start', () => {
    const payload = buildEventMessageV2(
      event({status: 'open', starts_at: '2020-01-01T00:00:00.000Z'}),
    );
    const labels = accessories(payload).map((b) => b.label);
    expect(labels).toEqual([OPEN_IN_APP_BUTTON_LABEL]);
    expect(JSON.stringify(payload)).toContain('Live, ★ Ranked');
  });

  it('keeps Voice after start and drops it when cancelled', () => {
    const live = buildEventMessageV2(
      event({starts_at: '2020-01-01T00:00:00.000Z', voice_channel_id: 'vc-1'}),
    );
    const cancelled = buildEventMessageV2(
      event({status: 'cancelled', voice_channel_id: 'vc-1'}),
    );
    expect(JSON.stringify(live)).toContain('<#vc-1>');
    expect(JSON.stringify(cancelled)).not.toContain('<#vc-1>');
  });
});
