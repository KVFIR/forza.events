import type {ApiErrorCode} from './apiErrorCodes.ts';
import {API_ERROR_CODES} from './apiErrorCodes.ts';
import type {DiscordUser} from './discord.ts';
import {openEventCustomId} from './eventLaunch.ts';
import type {JoinEventResult, LeaveEventResult} from './eventJoin.ts';

export const JOIN_EVENT_BUTTON_PREFIX = 'join_event:';
export const JOIN_EVENT_MODAL_PREFIX = 'join_event_modal:';
export const LEAVE_EVENT_BUTTON_PREFIX = 'leave_event:';
export const JOIN_EVENT_BUTTON_LABEL = 'Join event';
export const OPEN_IN_APP_BUTTON_LABEL = 'Open in FORZA.EVENTS';
export const JOIN_GAMERTAG_FIELD = 'gamertag';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EPHEMERAL = 64;
const INTERACTION_MSG = 4;
const INTERACTION_MODAL = 9;

function idAfterPrefix(customId: string | null | undefined, prefix: string): string | null {
  if (!customId?.startsWith(prefix)) return null;
  const id = customId.slice(prefix.length).trim();
  return UUID_RE.test(id) ? id : null;
}

export function joinEventCustomId(eventId: string): string {
  return `${JOIN_EVENT_BUTTON_PREFIX}${eventId}`;
}

export function joinEventModalCustomId(eventId: string): string {
  return `${JOIN_EVENT_MODAL_PREFIX}${eventId}`;
}

export function leaveEventCustomId(eventId: string): string {
  return `${LEAVE_EVENT_BUTTON_PREFIX}${eventId}`;
}

export function eventIdFromJoinEventCustomId(
  customId: string | null | undefined,
): string | null {
  return idAfterPrefix(customId, JOIN_EVENT_BUTTON_PREFIX);
}

export function eventIdFromJoinModalCustomId(
  customId: string | null | undefined,
): string | null {
  return idAfterPrefix(customId, JOIN_EVENT_MODAL_PREFIX);
}

export function eventIdFromLeaveEventCustomId(
  customId: string | null | undefined,
): string | null {
  return idAfterPrefix(customId, LEAVE_EVENT_BUTTON_PREFIX);
}

export function discordUserFromInteraction(interaction: {
  member?: {user?: DiscordUser};
  user?: DiscordUser;
}): DiscordUser | null {
  const user = interaction.member?.user ?? interaction.user;
  if (!user?.id || !user.username) return null;
  return {
    id: user.id,
    username: user.username,
    global_name: user.global_name,
    avatar: user.avatar,
    discriminator: user.discriminator,
  };
}

type ModalComponent = {
  type?: number;
  custom_id?: string;
  value?: string;
  component?: ModalComponent;
  components?: ModalComponent[];
};

/** Flatten Label (18) and legacy Action Row (1) modal values. */
export function gamertagFromModalSubmit(data: unknown): string {
  const components =
    data && typeof data === 'object' && 'components' in data
      ? (data as {components?: ModalComponent[]}).components
      : undefined;
  const walk = (nodes: ModalComponent[] | undefined): string | null => {
    for (const node of nodes ?? []) {
      if (node.custom_id === JOIN_GAMERTAG_FIELD && typeof node.value === 'string') {
        return node.value;
      }
      const nested = walk(node.components);
      if (nested != null) return nested;
      if (node.component) {
        const inner = walk([node.component]);
        if (inner != null) return inner;
      }
    }
    return null;
  };
  return walk(components) ?? '';
}

export function joinGamertagModalResponse(eventId: string): {
  type: number;
  data: Record<string, unknown>;
} {
  return {
    type: INTERACTION_MODAL,
    data: {
      custom_id: joinEventModalCustomId(eventId),
      title: 'Join event',
      components: [
        {
          type: 18,
          label: 'Xbox gamertag',
          description: '1–15 letters, numbers, or spaces',
          component: {
            type: 4,
            custom_id: JOIN_GAMERTAG_FIELD,
            style: 1,
            min_length: 1,
            max_length: 15,
            required: true,
            placeholder: 'Your Xbox gamertag',
          },
        },
      ],
    },
  };
}

export function ephemeralInteractionResponse(content: string): {
  type: number;
  data: {flags: number; content: string};
} {
  return {type: INTERACTION_MSG, data: {flags: EPHEMERAL, content}};
}

const JOIN_ERROR_COPY: Partial<Record<ApiErrorCode, string>> = {
  [API_ERROR_CODES.HOST_CANNOT_JOIN]: "Hosts can't join their own event.",
  [API_ERROR_CODES.REGISTRATION_CLOSED]: 'Registration is closed.',
  [API_ERROR_CODES.REGISTRATION_AFTER_START]: 'Registration closed — the event has started.',
  [API_ERROR_CODES.EVENT_NOT_FOUND]: 'Event not found.',
  [API_ERROR_CODES.EVENT_FULL]: 'Event is full.',
  [API_ERROR_CODES.PROFILE_INCOMPLETE]: 'Could not create your profile. Try again.',
  [API_ERROR_CODES.TOO_MANY_REQUESTS]: 'Too many attempts. Try again in a minute.',
  [API_ERROR_CODES.INTERNAL]: "Couldn't join. Try again.",
  [API_ERROR_CODES.LEADER_CANNOT_LEAVE]:
    "Convoy leaders can't leave until the host picks someone else.",
};

export function joinErrorCopy(code: ApiErrorCode): string {
  return JOIN_ERROR_COPY[code] ?? "Couldn't join. Try again.";
}

export function leaveErrorCopy(code: ApiErrorCode): string {
  if (code === API_ERROR_CODES.LEADER_CANNOT_LEAVE) {
    return JOIN_ERROR_COPY[code] ?? "Couldn't leave.";
  }
  if (code === API_ERROR_CODES.REGISTRATION_AFTER_START) {
    return "You can't leave after the event has started.";
  }
  if (code === API_ERROR_CODES.EVENT_NOT_FOUND) return 'Event not found.';
  if (code === API_ERROR_CODES.TOO_MANY_REQUESTS) {
    return JOIN_ERROR_COPY[code] ?? "Couldn't leave.";
  }
  return "Couldn't leave. Try again.";
}

function openAppButton(eventId: string) {
  return {
    type: 2,
    style: 1,
    label: OPEN_IN_APP_BUTTON_LABEL,
    custom_id: openEventCustomId(eventId),
  };
}

function leaveButton(eventId: string) {
  return {
    type: 2,
    style: 4,
    label: 'Leave',
    custom_id: leaveEventCustomId(eventId),
  };
}

function joinButton(eventId: string) {
  return {
    type: 2,
    style: 3,
    label: JOIN_EVENT_BUTTON_LABEL,
    custom_id: joinEventCustomId(eventId),
  };
}

function buttonRow(
  buttons: Array<ReturnType<typeof openAppButton>>,
): Array<{type: number; components: Array<ReturnType<typeof openAppButton>>}> {
  return [{type: 1, components: buttons}];
}

export function joinInteractionResponse(
  result: JoinEventResult,
  eventId: string,
): {type: number; data: Record<string, unknown>} {
  if (!result.ok) {
    return {
      type: INTERACTION_MSG,
      data: {
        flags: EPHEMERAL,
        content: joinErrorCopy(result.code),
        components: buttonRow([openAppButton(eventId)]),
      },
    };
  }
  const content = result.waitlisted
    ? 'Event is full — you are on the waitlist.'
    : `You're in — Convoy ${result.group_index}.`;
  return {
    type: INTERACTION_MSG,
    data: {
      flags: EPHEMERAL,
      content,
      components: buttonRow([leaveButton(eventId), openAppButton(eventId)]),
    },
  };
}

const RESPONSE_UPDATE_MESSAGE = 7;

export function leaveInteractionResponse(
  result: LeaveEventResult,
  eventId: string,
  opts?: {updateMessage?: boolean},
): {type: number; data: Record<string, unknown>} {
  const type = opts?.updateMessage ? RESPONSE_UPDATE_MESSAGE : INTERACTION_MSG;
  const withFlags = (data: Record<string, unknown>) =>
    opts?.updateMessage ? {type, data} : {type, data: {flags: EPHEMERAL, ...data}};

  if (!result.ok) {
    const retry =
      result.code === API_ERROR_CODES.INTERNAL ||
      result.code === API_ERROR_CODES.TOO_MANY_REQUESTS;
    return withFlags({
      content: leaveErrorCopy(result.code),
      components: buttonRow(
        retry
          ? [leaveButton(eventId), openAppButton(eventId)]
          : [openAppButton(eventId)],
      ),
    });
  }
  if (!result.removed) {
    return withFlags({
      content: "You're not in this event.",
      components: buttonRow([joinButton(eventId), openAppButton(eventId)]),
    });
  }
  return withFlags({
    content: "You've left.",
    components: buttonRow([joinButton(eventId), openAppButton(eventId)]),
  });
}
