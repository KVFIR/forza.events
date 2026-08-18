import {describe, expect, it} from 'vitest';
import {slugify} from '@edge/events.ts';

describe('slugify', () => {
  it('lowercases and adds date suffix', () => {
    const slug = slugify('My Cool Event!!!');
    expect(slug).toMatch(/^my-cool-event-\d{8}$/);
  });

  it('keeps letters from the title, including non-ASCII', () => {
    const slug = slugify('Летний круиз');
    expect(slug).toMatch(/^летний-круиз-\d{8}$/);
  });

  it('falls back to event when the title has no letters or numbers', () => {
    expect(slugify('!!!')).toMatch(/^event-\d{8}$/);
  });
});
