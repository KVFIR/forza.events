import {describe, expect, it} from 'vitest';
import {buildResultSubmitRows} from '../src/lib/eventResults';
import {buildResultSubmitRows as edgeBuild} from '@edge/eventResults.ts';

describe('event results submit parity', () => {
  it('client and Edge buildResultSubmitRows match', () => {
    const input = [
      {discordId: '1', dnf: false, dns: false},
      {discordId: '2', dnf: false, dns: true},
    ];
    expect(edgeBuild(input)).toEqual(buildResultSubmitRows(input));
  });
});
