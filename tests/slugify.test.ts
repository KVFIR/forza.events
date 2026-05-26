import {describe, expect, it} from 'vitest';
import {slugify} from '@edge/events.ts';

describe('slugify', () => {
  it('lowercases and adds date suffix', () => {
    const slug = slugify('My Cool Event!!!');
    expect(slug).toMatch(/^my-cool-event-\d{8}$/);
  });
});
