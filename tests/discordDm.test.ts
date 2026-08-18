import {describe, expect, it} from 'vitest';
import {buildDmEventComponents} from '../supabase/functions/_shared/discordDm.ts';
import {openEventCustomId} from '../supabase/functions/_shared/eventLaunch.ts';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';

describe('buildDmEventComponents', () => {
  it('puts an Activity launch button first and a browser link second', () => {
    const row = buildDmEventComponents(
      {id: EVENT_ID, urlKey: 'night-run'},
      'https://forza.events',
      'en',
    )[0]?.components;
    expect(row).toEqual([
      {
        type: 2,
        style: 1,
        label: 'Open in FORZA.EVENTS',
        custom_id: openEventCustomId(EVENT_ID),
      },
      {
        type: 2,
        style: 5,
        label: 'Open in browser',
        url: 'https://forza.events/event/night-run',
      },
    ]);
  });

  it('localizes both labels', () => {
    const row = buildDmEventComponents(
      {id: EVENT_ID, urlKey: EVENT_ID},
      'https://forza.events',
      'ru',
    )[0]?.components;
    expect(row?.[0]?.label).toBe('Открыть в FORZA.EVENTS');
    expect(row?.[1]?.label).toBe('Открыть в браузере');
  });
});
