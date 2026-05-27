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
  it('shows PI and full additional restrictions for open build', () => {
    const embed = buildEventEmbed(
      event({additional_car_restrictions: 'No engine swap; stock bodykit only'}),
    ).embeds[0];

    const carField = embed.fields.find((field) => field.name === '🚗 Car rules');
    expect(carField?.value).toBe(
      'Open build `A 650` `No engine swap; stock bodykit only`',
    );
    expect(carField?.value).not.toContain('extra rules');
  });

  it('omits restrictions when open build has no additional notes', () => {
    const embed = buildEventEmbed(event()).embeds[0];

    const carField = embed.fields.find((field) => field.name === '🚗 Car rules');
    expect(carField?.value).toBe('Open build `A 650`');
  });

  it('summarizes per-car tuning rules as extra rules on restricted list', () => {
    const embed = buildEventEmbed(
      event({
        car_rule_mode: 'restricted_list',
        allowed_cars: [
          {
            make: 'Lotus',
            model: 'Lotus Emira',
            year: 2023,
            max_pi: 800,
            tune_share_code: null,
            car_restrictions: ['No engine swap', 'No drivetrain swap'],
          },
        ],
      }),
    ).embeds[0];

    const carField = embed.fields.find((field) => field.name === '🚗 Car rules');
    expect(carField?.value).toContain('2023 Lotus Emira');
    expect(carField?.value).toContain('`S1 800`');
    expect(carField?.value).toContain('`extra rules`');
    expect(carField?.value).not.toContain('No engine swap');
    expect(carField?.value).not.toContain('No drivetrain swap');
  });
});
