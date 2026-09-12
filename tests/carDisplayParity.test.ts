import {describe, expect, it} from 'vitest';
import {
  formatCarDisplayName,
  formatCarEmbedName,
  formatCarListDisplayNames,
  stripYearFromModelTitle,
} from '../src/lib/carDisplay';
import {
  formatCarDisplayName as edgeFormatCarDisplayName,
  formatCarEmbedName as edgeFormatCarEmbedName,
  formatCarListDisplayNames as edgeFormatCarListDisplayNames,
} from '@edge/carDisplay.ts';

describe('car display parity', () => {
  const car = {make: 'Acura', model: 'Acura Integra Type R', year: 2001};

  it('client and Edge formatCarDisplayName match', () => {
    expect(edgeFormatCarDisplayName(car)).toBe(formatCarDisplayName(car));
    expect(formatCarDisplayName(car)).toBe("Acura Integra '01");
  });

  it('uses wiki abbreviation when present', () => {
    const named = {...car, abbreviation: "Acura ITR '01"};
    expect(formatCarDisplayName(named)).toBe("Acura ITR '01");
    expect(edgeFormatCarDisplayName(named)).toBe("Acura ITR '01");
  });

  it('client and Edge formatCarEmbedName match (no year prefix)', () => {
    expect(edgeFormatCarEmbedName(car)).toBe(formatCarEmbedName(car));
    expect(formatCarEmbedName(car)).toBe("Acura Integra '01");
  });

  it('adds make when model omits it', () => {
    const legacy = {make: 'Ford', model: 'GT40'};
    expect(formatCarDisplayName(legacy)).toBe('Ford GT40');
    expect(edgeFormatCarDisplayName(legacy)).toBe('Ford GT40');
  });

  it('strips year parenthetical from model title', () => {
    expect(stripYearFromModelTitle('Audi RS 4 Avant (2001)')).toBe('Audi RS 4 Avant');
    expect(stripYearFromModelTitle('Subaru BRZ (2022) Forza Edition')).toBe(
      'Subaru BRZ Forza Edition',
    );
  });

  it('appends YY only when make+model collide in a list', () => {
    const cars = [
      {id: 'a', make: 'Audi', model: 'Audi RS 4 Avant', year: 2001},
      {id: 'b', make: 'Audi', model: 'Audi RS 4 Avant', year: 2013},
      {id: 'c', make: 'Ford', model: 'Ford GT', year: 2017},
    ];
    const labels = formatCarListDisplayNames(cars);
    expect(labels.get('a')).toBe("Audi RS 4 Avant '01");
    expect(labels.get('b')).toBe("Audi RS 4 Avant '13");
    expect(labels.get('c')).toBe('Ford GT');
    expect(edgeFormatCarListDisplayNames(cars)).toEqual(labels);
  });

  it('does not double a year suffix already on the abbreviation', () => {
    const cars = [
      {id: 'a', make: 'Audi', model: 'Audi RS 4 Avant', year: 2001, abbreviation: "Audi RS4 '01"},
      {id: 'b', make: 'Audi', model: 'Audi RS 4 Avant', year: 2013, abbreviation: "Audi RS4 '13"},
    ];
    const labels = formatCarListDisplayNames(cars);
    expect(labels.get('a')).toBe("Audi RS4 '01");
    expect(labels.get('b')).toBe("Audi RS4 '13");
    expect(edgeFormatCarListDisplayNames(cars)).toEqual(labels);
  });

  it('full list labels keep catalog titles even when abbreviation is set', () => {
    const cars = [
      {id: 'a', make: 'Acura', model: 'Acura Integra Type R', year: 2001, abbreviation: "Acura ITR '01"},
    ];
    const labels = formatCarListDisplayNames(cars, {full: true});
    expect(labels.get('a')).toBe('Acura Integra Type R');
    expect(edgeFormatCarListDisplayNames(cars, {full: true})).toEqual(labels);
  });

  it('falls back to the catalog title when HUD names still collide', () => {
    const cars = [
      {
        id: 'stock',
        make: 'BMW',
        model: 'BMW M4 Competition Coupé',
        year: 2021,
        abbreviation: "BMW M4 '21",
      },
      {
        id: 'wp',
        make: 'BMW',
        model: "BMW M4 Competition Coupé 'Welcome Pack'",
        year: 2021,
        abbreviation: "BMW M4 '21",
      },
    ];
    const labels = formatCarListDisplayNames(cars);
    expect(labels.get('stock')).toBe('BMW M4 Competition Coupé');
    expect(labels.get('wp')).toBe("BMW M4 Competition Coupé 'Welcome Pack'");
    expect(edgeFormatCarListDisplayNames(cars)).toEqual(labels);
  });

  it('collides on display name and recovers year from model title', () => {
    const cars = [
      {id: 'a', make: 'BMW', model: 'BMW M3 (1988)', year: null},
      {id: 'b', make: 'BMW', model: 'M3', year: 2005},
    ];
    const labels = formatCarListDisplayNames(cars);
    expect(labels.get('a')).toBe("BMW M3 '88");
    expect(labels.get('b')).toBe("BMW M3 '05");
    expect(edgeFormatCarListDisplayNames(cars)).toEqual(labels);
  });

  it('keeps distinct map keys for the same catalog car twice (alt builds)', () => {
    const cars = [
      {id: 'row-1', carId: 'catalog-1', make: 'Ford', model: 'Ford GT', year: 2017},
      {id: 'row-2', carId: 'catalog-1', make: 'Ford', model: 'Ford GT', year: 2017},
    ];
    const labels = formatCarListDisplayNames(cars, {full: true});
    expect(labels.get('row-1')).toBe('Ford GT');
    expect(labels.get('row-2')).toBe('Ford GT');
    expect(labels.size).toBe(2);
    expect(edgeFormatCarListDisplayNames(cars, {full: true})).toEqual(labels);
  });
});
