import {describe, expect, it} from 'vitest';
import en from '../i18n/locales/en.json';
import {EVENT_TYPE_VALUES, eventTypeLabelEn, isEventType, normalizeEventType} from './eventTypes';

describe('isEventType', () => {
  it('accepts known types', () => {
    for (const t of EVENT_TYPE_VALUES) {
      expect(isEventType(t)).toBe(true);
    }
  });

  it('rejects unknown', () => {
    expect(isEventType('nascar')).toBe(false);
    expect(isEventType(null)).toBe(false);
  });
});

describe('normalizeEventType', () => {
  it('falls back to road', () => {
    expect(normalizeEventType('unknown')).toBe('road');
    expect(normalizeEventType('dirt')).toBe('dirt');
  });
});

describe('eventTypeLabelEn', () => {
  it('matches en.json eventTypes (single source for EN labels)', () => {
    for (const type of EVENT_TYPE_VALUES) {
      expect(eventTypeLabelEn(type)).toBe(en.eventTypes[type]);
    }
  });
});
