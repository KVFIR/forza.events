import {describe, expect, it} from 'vitest';
import {formatCarDisplayName, formatCarEmbedName} from '../src/lib/carDisplay';
import {
  formatCarDisplayName as edgeFormatCarDisplayName,
  formatCarEmbedName as edgeFormatCarEmbedName,
} from '@edge/carDisplay.ts';

describe('car display parity', () => {
  const car = {make: 'Acura', model: 'Acura Integra Type R', year: 2001};

  it('client and Edge formatCarDisplayName match', () => {
    expect(edgeFormatCarDisplayName(car)).toBe(formatCarDisplayName(car));
    expect(formatCarDisplayName(car)).toBe('Acura Integra Type R');
  });

  it('client and Edge formatCarEmbedName match', () => {
    expect(edgeFormatCarEmbedName(car)).toBe(formatCarEmbedName(car));
    expect(formatCarEmbedName(car)).toBe('2001 Acura Integra Type R');
  });

  it('adds make when model omits it', () => {
    const legacy = {make: 'Ford', model: 'GT40'};
    expect(formatCarDisplayName(legacy)).toBe('Ford GT40');
    expect(edgeFormatCarDisplayName(legacy)).toBe('Ford GT40');
  });
});
