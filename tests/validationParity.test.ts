import {describe, expect, it} from 'vitest';
import {validateDraftForm, validatePublishForm} from '../src/lib/eventSpec';
import {VALIDATION_CODES, VALIDATION_CODE_LIST} from '../src/lib/validationCodes';
import {validateDraft, validatePublishReady} from '@edge/eventSpec.ts';
import {VALIDATION_CODE_LIST as EDGE_VALIDATION_CODES} from '@edge/validationCodes.ts';

describe('validation codes sync', () => {
  it('client and Edge lists match', () => {
    expect([...EDGE_VALIDATION_CODES].sort()).toEqual([...VALIDATION_CODE_LIST].sort());
  });
});

describe('draft validation parity', () => {
  const cases = [
    {
      name: 'title required',
      client: {title: '', type: 'road', startsAtLocal: '2030-01-01T12:00', guildId: 'g1'},
      server: {title: '', type: 'road', starts_at: '2030-01-01T00:00:00.000Z', guild_id: 'g1'},
      code: VALIDATION_CODES.TITLE_REQUIRED,
    },
    {
      name: 'type required',
      client: {title: 'Race', type: 'invalid', startsAtLocal: '2030-01-01T12:00', guildId: 'g1'},
      server: {title: 'Race', type: 'invalid', starts_at: '2030-01-01T00:00:00.000Z', guild_id: 'g1'},
      code: VALIDATION_CODES.TYPE_REQUIRED,
    },
    {
      name: 'starts at required',
      client: {title: 'Race', type: 'road', startsAtLocal: '', guildId: 'g1'},
      server: {title: 'Race', type: 'road', guild_id: 'g1'},
      code: VALIDATION_CODES.STARTS_AT_REQUIRED,
    },
    {
      name: 'guild required',
      client: {title: 'Race', type: 'road', startsAtLocal: '2030-01-01T12:00', guildId: null},
      server: {title: 'Race', type: 'road', starts_at: '2030-01-01T00:00:00.000Z'},
      code: VALIDATION_CODES.GUILD_REQUIRED,
    },
    {
      name: 'valid draft',
      client: {title: 'Race', type: 'road', startsAtLocal: '2030-01-01T12:00', guildId: 'g1'},
      server: {title: 'Race', type: 'road', starts_at: '2030-01-01T00:00:00.000Z', guild_id: 'g1'},
      code: null,
    },
  ] as const;

  for (const c of cases) {
    it(c.name, () => {
      expect(validateDraftForm(c.client)).toBe(c.code);
      expect(validateDraft(c.server)).toBe(c.code);
    });
  }
});

describe('publish validation parity', () => {
  const base = {
    title: 'Race',
    type: 'road',
    startsAtLocal: '2030-01-01T12:00',
    guildId: 'g1',
    channelId: 'c1',
    carRuleMode: 'anything_goes' as const,
    maxPi: 500,
    carCount: 0,
    lobbyLeaderGamertag: 'Leader1',
  };

  it('channel required', () => {
    const code = VALIDATION_CODES.CHANNEL_REQUIRED;
    expect(validatePublishForm({...base, channelId: null})).toBe(code);
    expect(
      validatePublishReady({
        title: base.title,
        type: base.type,
        starts_at: '2030-01-01T00:00:00.000Z',
        guild_id: base.guildId,
        channel_id: null,
        lobby_leader_gamertag: base.lobbyLeaderGamertag,
        car_rule_mode: 'anything_goes',
        max_pi: base.maxPi,
      }),
    ).toBe(code);
  });

  it('publish-event payload shape passes when channel_id set', () => {
    expect(
      validatePublishReady({
        title: base.title,
        type: base.type,
        starts_at: '2030-01-01T00:00:00.000Z',
        guild_id: base.guildId,
        channel_id: base.channelId,
        lobby_leader_gamertag: base.lobbyLeaderGamertag,
        car_rule_mode: 'anything_goes',
        max_pi: base.maxPi,
      }),
    ).toBeNull();
  });

  it('PI range for open build', () => {
    const code = VALIDATION_CODES.PI_RANGE;
    expect(validatePublishForm({...base, maxPi: 50})).toBe(code);
    expect(
      validatePublishReady({
        title: base.title,
        type: base.type,
        starts_at: '2030-01-01T00:00:00.000Z',
        guild_id: base.guildId,
        channel_id: base.channelId,
        lobby_leader_gamertag: base.lobbyLeaderGamertag,
        car_rule_mode: 'anything_goes',
        max_pi: 50,
      }),
    ).toBe(code);
  });
});
