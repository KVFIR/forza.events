import {describe, expect, it} from 'vitest';
import i18n from '../i18n';
import {participantResultLabel} from './participantResultsLabel';

describe('participantResultLabel', () => {
  const t = i18n.t.bind(i18n);

  it('formats finish position', () => {
    expect(participantResultLabel({position: 2, dnf: false, dns: false}, t)).toBe('P2');
  });

  it('formats DNF and DNS', () => {
    expect(participantResultLabel({position: 5, dnf: true, dns: false}, t)).toBe('DNF');
    expect(participantResultLabel({position: 5, dnf: false, dns: true}, t)).toBe('DNS');
  });
});
