import {describe, expect, it} from 'vitest';
import {API_ERROR_CODES} from '../supabase/functions/_shared/apiErrorCodes.ts';
import {
  JOIN_GAMERTAG_FIELD,
  discordUserFromInteraction,
  eventIdFromJoinEventCustomId,
  eventIdFromJoinModalCustomId,
  eventIdFromLeaveEventCustomId,
  gamertagFromModalSubmit,
  joinErrorCopy,
  joinEventCustomId,
  joinEventModalCustomId,
  joinGamertagModalResponse,
  joinInteractionResponse,
  leaveEventCustomId,
  leaveInteractionResponse,
} from '../supabase/functions/_shared/embedJoin.ts';

const EVENT_ID = '87c1403e-730a-44cb-98f8-d0e20918bc1c';

describe('embed join custom ids', () => {
  it('round-trips join button and modal ids', () => {
    expect(eventIdFromJoinEventCustomId(joinEventCustomId(EVENT_ID))).toBe(EVENT_ID);
    expect(eventIdFromJoinModalCustomId(joinEventModalCustomId(EVENT_ID))).toBe(EVENT_ID);
    expect(eventIdFromLeaveEventCustomId(leaveEventCustomId(EVENT_ID))).toBe(EVENT_ID);
  });

  it('rejects open_event and non-uuid ids', () => {
    expect(eventIdFromJoinEventCustomId(`open_event:${EVENT_ID}`)).toBeNull();
    expect(eventIdFromJoinEventCustomId('join_event:not-a-uuid')).toBeNull();
    expect(eventIdFromJoinEventCustomId(joinEventModalCustomId(EVENT_ID))).toBeNull();
    expect(eventIdFromJoinModalCustomId('join_event_modal:')).toBeNull();
  });
});

describe('gamertagFromModalSubmit', () => {
  it('reads Label-wrapped text input', () => {
    expect(
      gamertagFromModalSubmit({
        components: [
          {
            type: 18,
            component: {type: 4, custom_id: JOIN_GAMERTAG_FIELD, value: 'KVFIR'},
          },
        ],
      }),
    ).toBe('KVFIR');
  });

  it('reads legacy action-row text input', () => {
    expect(
      gamertagFromModalSubmit({
        components: [
          {
            type: 1,
            components: [{type: 4, custom_id: JOIN_GAMERTAG_FIELD, value: ' Player One '}],
          },
        ],
      }),
    ).toBe(' Player One ');
  });
});

describe('joinGamertagModalResponse', () => {
  it('asks for a 15-char Xbox gamertag', () => {
    const modal = joinGamertagModalResponse(EVENT_ID);
    expect(modal.type).toBe(9);
    expect(modal.data.custom_id).toBe(joinEventModalCustomId(EVENT_ID));
    const field = (modal.data.components as Array<{component: {max_length: number; custom_id: string}}>)[0]
      ?.component;
    expect(field?.custom_id).toBe(JOIN_GAMERTAG_FIELD);
    expect(field?.max_length).toBe(15);
  });
});

describe('joinInteractionResponse', () => {
  it('confirms a seat with Leave and an Activity launch button', () => {
    const res = joinInteractionResponse(
      {ok: true, joined: true, waitlisted: false, group_index: 2, embedSynced: false},
      EVENT_ID,
    );
    expect(res.data.content).toBe("You're in — Convoy 2.");
    const buttons = (
      res.data.components as Array<{components: Array<{custom_id: string; label: string}>}>
    )[0]?.components;
    expect(buttons?.map((b) => b.label)).toEqual(['Leave', 'Open in FORZA.EVENTS']);
    expect(buttons?.[0]?.custom_id).toBe(`leave_event:${EVENT_ID}`);
    expect(buttons?.[1]?.custom_id).toBe(`open_event:${EVENT_ID}`);
  });

  it('puts Leave on the waitlist receipt too', () => {
    const res = joinInteractionResponse(
      {ok: true, joined: true, waitlisted: true, group_index: 1, embedSynced: false},
      EVENT_ID,
    );
    expect(res.data.content).toBe('Event is full — you are on the waitlist.');
    const labels = (
      res.data.components as Array<{components: Array<{label: string}>}>
    )[0]?.components.map((b) => b.label);
    expect(labels).toEqual(['Leave', 'Open in FORZA.EVENTS']);
  });

  it('maps host-cannot-join to copy and keeps Open in app', () => {
    expect(joinErrorCopy(API_ERROR_CODES.HOST_CANNOT_JOIN)).toContain('Hosts');
    const res = joinInteractionResponse(
      {ok: false, code: API_ERROR_CODES.HOST_CANNOT_JOIN},
      EVENT_ID,
    );
    const labels = (
      res.data.components as Array<{components: Array<{label: string}>}>
    )[0]?.components.map((b) => b.label);
    expect(labels).toEqual(['Open in FORZA.EVENTS']);
  });
});

describe('leaveInteractionResponse', () => {
  it('replaces an ephemeral join receipt with Join after leaving', () => {
    const res = leaveInteractionResponse(
      {ok: true, removed: true, embedSynced: false},
      EVENT_ID,
      {updateMessage: true},
    );
    expect(res.type).toBe(7);
    expect(res.data.content).toBe("You've left.");
    expect(res.data.flags).toBeUndefined();
    const labels = (
      res.data.components as Array<{components: Array<{label: string}>}>
    )[0]?.components.map((b) => b.label);
    expect(labels).toEqual(['Join event', 'Open in FORZA.EVENTS']);
  });

  it('keeps Open in app when a convoy leader cannot leave', () => {
    const res = leaveInteractionResponse(
      {ok: false, code: API_ERROR_CODES.LEADER_CANNOT_LEAVE},
      EVENT_ID,
      {updateMessage: true},
    );
    expect(res.type).toBe(7);
    expect(res.data.content).toContain('Convoy leaders');
    const labels = (
      res.data.components as Array<{components: Array<{label: string}>}>
    )[0]?.components.map((b) => b.label);
    expect(labels).toEqual(['Open in FORZA.EVENTS']);
  });

  it('keeps Leave on a transient leave error so the racer can retry', () => {
    const res = leaveInteractionResponse(
      {ok: false, code: API_ERROR_CODES.INTERNAL},
      EVENT_ID,
      {updateMessage: true},
    );
    const labels = (
      res.data.components as Array<{components: Array<{label: string}>}>
    )[0]?.components.map((b) => b.label);
    expect(labels).toEqual(['Leave', 'Open in FORZA.EVENTS']);
  });
});

describe('discordUserFromInteraction', () => {
  it('prefers guild member user', () => {
    const user = discordUserFromInteraction({
      member: {user: {id: '1', username: 'kvfir'}},
      user: {id: '2', username: 'other'},
    });
    expect(user?.id).toBe('1');
  });
});
