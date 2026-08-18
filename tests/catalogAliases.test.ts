import {describe, expect, it} from 'vitest';
import {filterRaceNumberAliases} from '../scripts/catalogModelUtils.mjs';

describe('filterRaceNumberAliases', () => {
  it('drops a wiki HUD name whose race number is not on the title', () => {
    expect(
      filterRaceNumberAliases('Extreme E #125 ABT Cupra XE', ['Extreme E #99']),
    ).toEqual(['Extreme E #125']);
  });

  it('keeps an alias that matches the title number', () => {
    expect(
      filterRaceNumberAliases('Extreme E #99 Chip Ganassi Racing GMC Hummer EV', [
        'Extreme E #99',
      ]),
    ).toEqual(['Extreme E #99']);
  });
});
