import {describe, expect, it} from 'vitest';
import {buildResultSubmitRows} from '../src/lib/eventResults';
import {buildResultSubmitRows as edgeBuild} from '@edge/eventResults.ts';

describe('event results submit parity', () => {
  it('client and Edge buildResultSubmitRows match (per_group default)', () => {
    const input = [
      {discordId: '1', dnf: false, dns: false},
      {discordId: '2', dnf: false, dns: true},
    ];
    expect(edgeBuild(input)).toEqual(buildResultSubmitRows(input));
  });

  it('client and Edge match in overall mode across groups', () => {
    const input = [
      {discordId: 'a', groupIndex: 1, dnf: false, dns: false},
      {discordId: 'b', groupIndex: 2, dnf: false, dns: false},
      {discordId: 'c', groupIndex: 1, dnf: true, dns: false},
    ];
    expect(edgeBuild(input, 'overall')).toEqual(buildResultSubmitRows(input, 'overall'));
  });
});
