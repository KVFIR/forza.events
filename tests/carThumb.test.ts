import {describe, expect, it} from 'vitest';
import {carThumbFileName, carThumbUrl, CAR_THUMB_NULL} from '../src/lib/carThumb';

describe('carThumbFileName', () => {
  it('slugs catalog identity for local public/cars paths', () => {
    expect(
      carThumbFileName({
        make: 'Abarth',
        model: 'Abarth Fiat 131',
        year: 1980,
        pi: 399,
      }),
    ).toBe('abarth_fiat_131_1980_399.webp');
    expect(
      carThumbUrl(
        {make: 'Ford', model: 'Ford #5 Escort RS1800 MkII', year: 1977, pi: 544},
        'fh6',
      ),
    ).toBe('/cars/fh6/ford_5_escort_rs1800_mkii_1977_544.webp');
  });

  it('uses the bundled Null Car path', () => {
    expect(CAR_THUMB_NULL).toBe('/cars/null.webp');
  });
});
