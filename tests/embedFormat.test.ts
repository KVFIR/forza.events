import {describe, expect, it} from 'vitest';
import {
  buildEventEmbed,
  type EmbedEventInput,
} from '../supabase/functions/_shared/events.ts';

function event(partial: Partial<EmbedEventInput> = {}): EmbedEventInput {
  return {
    id: 'event-1',
    title: 'Open Build Night',
    type: 'road',
    status: 'open',
    starts_at: new Date(Date.now() + 3_600_000).toISOString(),
    max_players: 12,
    current_players: 2,
    max_pi: 650,
    car_rule_mode: 'anything_goes',
    lobby_leader_gamertag: 'FORZA.EVENTS',
    ...partial,
  };
}

describe('buildEventEmbed', () => {
  it('shows only PI plus a short note for open build custom restrictions', () => {
    const embed = buildEventEmbed(
      event({additional_car_restrictions: 'No engine swap; stock bodykit only'}),
    ).embeds[0];

    const carField = embed.fields.find((field) => field.name === '🚗 Car rules');
    expect(carField?.value).toBe('Open build `A 650` (`extra rules`)');
    expect(embed.fields.some((field) => field.name === '🔧 Restrictions')).toBe(false);
    expect(JSON.stringify(embed)).not.toContain('No engine swap');
    expect(JSON.stringify(embed)).not.toContain('stock bodykit only');
  });

  it('omits the note when there are no extra restrictions', () => {
    const embed = buildEventEmbed(event()).embeds[0];

    const carField = embed.fields.find((field) => field.name === '🚗 Car rules');
    expect(carField?.value).toBe('Open build `A 650`');
  });
});
