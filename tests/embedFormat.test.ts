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

  it('shows X class for open build capped at 999', () => {
    const embed = buildEventEmbed(event({max_pi: 999})).embeds[0];

    const carField = embed.fields.find((field) => field.name === '🚗 Car rules');
    expect(carField?.value).toBe('Open build `X 999`');
  });

  it('shows R class for open build capped at 998', () => {
    const embed = buildEventEmbed(event({max_pi: 998})).embeds[0];

    const carField = embed.fields.find((field) => field.name === '🚗 Car rules');
    expect(carField?.value).toBe('Open build `R 998`');
  });

  it('formats named tracks with share code and format', () => {
    const embed = buildEventEmbed(
      event({
        tracks: [
          {name: 'Laguna Seca', share_code: '123 456 789', format: '15 laps'},
          {name: 'Highlands', share_code: null, format: '30 min'},
        ],
      }),
    ).embeds[0];

    const trackField = embed.fields.find((field) => field.name === '🛣️ Tracks');
    expect(trackField?.value).toContain('Laguna Seca');
    expect(trackField?.value).toContain('`123 456 789`');
    expect(trackField?.value).toContain('15 laps');
    expect(trackField?.value).toContain('2. Highlands');
    expect(trackField?.value).toContain('30 min');
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

  it('links embed title to the public event detail URL', () => {
    const embed = buildEventEmbed(event({id: 'evt-42'})).embeds[0];
    expect(embed.url).toBe('https://forza.events/event/evt-42');
  });

  it('puts host description in About field, not embed description', () => {
    const embed = buildEventEmbed(
      event({
        title: 'Friday Night Sprint',
        description: 'Friday Night Sprint\n\nBring your best A-class car.',
      }),
    ).embeds[0];

    expect(embed.title).toBe('Friday Night Sprint');
    expect(embed.description).toBeUndefined();
    const aboutField = embed.fields.find((field) => field.name === '📝 About');
    expect(aboutField?.value).toBe('Friday Night Sprint\n\nBring your best A-class car.');
  });

  it('keeps long host copy in About field up to field limit', () => {
    const longBody = 'x'.repeat(500);
    const embed = buildEventEmbed(event({description: longBody})).embeds[0];
    const aboutField = embed.fields.find((field) => field.name === '📝 About');
    expect(aboutField?.value).toBe(longBody);
    expect(embed.description).toBeUndefined();
  });

  it('uses embed description only for lifecycle status', () => {
    const embed = buildEventEmbed(
      event({
        status: 'cancelled',
        description: 'Original host notes',
      }),
    ).embeds[0];

    expect(embed.description).toContain('CANCELLED');
    expect(embed.description).not.toContain('Original host notes');
    expect(embed.fields.find((field) => field.name === '📝 About')?.value).toBe(
      'Original host notes',
    );
  });
});
