import {describe, expect, it} from 'vitest';
import {postgrestEq} from '../cloudflare/eventOgHandler.js';

describe('postgrestEq', () => {
  it('leaves slugs and UUIDs unquoted', () => {
    expect(postgrestEq('fh6-20260816')).toBe('eq.fh6-20260816');
    expect(postgrestEq('94d86ab7-ce55-49f8-84e3-91f3b9a7b39c')).toBe(
      'eq.94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
    );
    expect(postgrestEq('летний-круиз-20260818')).toBe('eq.летний-круиз-20260818');
  });

  it('does not extra-quote when encoded as a query param', () => {
    const params = new URLSearchParams({slug: postgrestEq('летний-круиз-20260818')});
    expect(params.toString()).not.toContain('%22');
    expect(postgrestEq('a:b')).toBe('eq.a:b');
  });
});
