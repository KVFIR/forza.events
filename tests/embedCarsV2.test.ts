import {describe, expect, it} from 'vitest';
import {formatPiClassEmoji, formatPiV2} from '../supabase/functions/_shared/discordPiEmoji.ts';
import {formatEventCarsV2, formatEventCarsV2Blocks} from '../supabase/functions/_shared/embedCarsV2.ts';
import type {EmbedAllowedCar} from '../supabase/functions/_shared/events.ts';

const THIN = '\u2009';
const PI_B = formatPiV2(600, 'fh6');
const PI_A = formatPiV2(650, 'fh6');
const PI_S1 = formatPiV2(800, 'fh6');

function car(partial: Partial<EmbedAllowedCar> & Pick<EmbedAllowedCar, 'make' | 'model'>): EmbedAllowedCar {
  return {
    year: 1990,
    max_pi: 600,
    tune_share_code: null,
    car_restrictions: [],
    abbreviation: partial.abbreviation ?? partial.model,
    ...partial,
  };
}

describe('formatPiV2', () => {
  it('puts the class emoji outside backticks around the number', () => {
    expect(PI_B).toBe(`${formatPiClassEmoji('B')}\`600\``);
    expect(PI_A).toBe(`${formatPiClassEmoji('A')}\`650\``);
    expect(PI_S1).toBe(`${formatPiClassEmoji('S1')}\`800\``);
  });
});

describe('formatEventCarsV2 open build', () => {
  it('omits when there is no PI cap and no notes', () => {
    expect(formatEventCarsV2({car_rule_mode: 'anything_goes', max_pi: null})).toBeNull();
  });

  it('shows PI only under the Cars heading', () => {
    expect(formatEventCarsV2({car_rule_mode: 'anything_goes', max_pi: 650, game: 'fh6'})).toBe(
      `🚗 **Cars**\n${PI_A}`,
    );
  });

  it('shows PI and notes on one shared line', () => {
    expect(
      formatEventCarsV2({
        car_rule_mode: 'anything_goes',
        max_pi: 650,
        additional_car_restrictions: 'No engine swap',
        game: 'fh6',
      }),
    ).toBe(`🚗 **Cars**\n${PI_A}; \`No engine swap\``);
  });
});

describe('formatEventCarsV2 restricted list', () => {
  it('omits an empty list', () => {
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: []})).toBeNull();
  });

  it('puts identical restrictions on one line under Cars', () => {
    const cars = [
      car({make: 'Ford', model: 'Escort', abbreviation: "#5 Escort '77", car_restrictions: ['No engine swap']}),
      car({make: 'Lancia', model: 'Stratos', abbreviation: 'Lancia Stratos', car_restrictions: ['No engine swap']}),
    ];
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      `🚗 **Cars**\n${PI_B}; \`No engine swap\`\nFord Escort (1990)\nLancia Stratos (1990)`,
    );
  });

  it('keeps a shared core on one line and unique extras in backticks on that car', () => {
    const shared = ['No engine swap', 'Keep RWD'];
    const cars = [
      car({make: 'Ford', model: 'Escort', abbreviation: 'Escort', car_restrictions: shared}),
      car({
        make: 'Porsche',
        model: '911',
        abbreviation: "Porsche 911 '73",
        car_restrictions: [...shared, 'No widebody kit'],
      }),
    ];
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      `🚗 **Cars**\n${PI_B}; \`No engine swap\`; \`Keep RWD\`\nFord Escort (1990)\nPorsche 911 (1990); \`No widebody kit\``,
    );
    expect(
      formatEventCarsV2Blocks({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'}),
    ).toEqual({
      header: '🚗 **Cars**',
      shared: `${PI_B}; \`No engine swap\`; \`Keep RWD\``,
      list: 'Ford Escort (1990)\nPorsche 911 (1990); `No widebody kit`',
    });
  });

  it('puts unique restrictions on the car line when nothing is shared', () => {
    const cars = [
      car({make: 'A', model: 'One', abbreviation: 'One', car_restrictions: ['Grip']}),
      car({make: 'B', model: 'Two', abbreviation: 'Two', car_restrictions: ['Top Speed']}),
    ];
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      `🚗 **Cars**\n${PI_B}\nA One (1990); \`Grip\`\nB Two (1990); \`Top Speed\``,
    );
  });

  it('puts mixed PI on the name line', () => {
    const cars = [
      car({make: 'A', model: 'One', abbreviation: 'One', max_pi: 650}),
      car({make: 'B', model: 'Two', abbreviation: 'Two', max_pi: 800}),
    ];
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      `🚗 **Cars**\n${PI_A} A One (1990)\n${PI_S1} B Two (1990)`,
    );
  });

  it('keeps tune share codes with thin spaces on the name that has them', () => {
    const cars = [
      car({make: 'A', model: 'One', abbreviation: 'One', tune_share_code: '123 456 789'}),
      car({make: 'B', model: 'Two', abbreviation: 'Two'}),
    ];
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      `🚗 **Cars**\n${PI_B}\nA One (1990); \`123${THIN}456${THIN}789\`\nB Two (1990)`,
    );
  });

  it('lists every car, one line each', () => {
    const cars = Array.from({length: 7}, (_, i) =>
      car({make: 'Make', model: `Car ${i}`, abbreviation: `C${i}`}),
    );
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      [
        '🚗 **Cars**',
        PI_B,
        'Make Car 0 (1990)',
        'Make Car 1 (1990)',
        'Make Car 2 (1990)',
        'Make Car 3 (1990)',
        'Make Car 4 (1990)',
        'Make Car 5 (1990)',
        'Make Car 6 (1990)',
      ].join('\n'),
    );
  });

  it('does not hide a later car with a different restriction', () => {
    const shared = ['No engine swap'];
    const cars = [
      ...Array.from({length: 5}, (_, i) =>
        car({make: 'Make', model: `Car ${i}`, abbreviation: `C${i}`, car_restrictions: shared}),
      ),
      car({
        make: 'Make',
        model: 'Hidden',
        abbreviation: 'Hidden',
        car_restrictions: ['Something else'],
      }),
    ];
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      [
        '🚗 **Cars**',
        PI_B,
        'Make Car 0 (1990); `No engine swap`',
        'Make Car 1 (1990); `No engine swap`',
        'Make Car 2 (1990); `No engine swap`',
        'Make Car 3 (1990); `No engine swap`',
        'Make Car 4 (1990); `No engine swap`',
        'Make Hidden (1990); `Something else`',
      ].join('\n'),
    );
  });

  it('puts extras only on cars that have them when others have none', () => {
    const cars = [
      car({make: 'A', model: 'One', abbreviation: 'One'}),
      car({make: 'B', model: 'Two', abbreviation: 'Two', car_restrictions: ['Grip']}),
    ];
    expect(formatEventCarsV2({car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'})).toBe(
      `🚗 **Cars**\n${PI_B}\nA One (1990)\nB Two (1990); \`Grip\``,
    );
  });

  it('stops with +N when the list exceeds the budget', () => {
    const cars = Array.from({length: 5}, (_, i) =>
      car({
        make: 'Make',
        model: `Car ${i}`,
        abbreviation: `C${i}`,
        car_restrictions: [`Rule ${i}`],
      }),
    );
    const out = formatEventCarsV2(
      {car_rule_mode: 'restricted_list', allowed_cars: cars, game: 'fh6'},
      {maxChars: 90},
    );
    expect(out).toBe(`🚗 **Cars**\n${PI_B}\nMake Car 0 (1990); \`Rule 0\`\n+4`);
  });
});
