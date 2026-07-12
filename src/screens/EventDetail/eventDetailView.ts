import type {TFunction} from 'i18next';
import type {EventResultRow} from '../../lib/events';
import {
  isEventSuccessfullyCompleted,
  resolveEventResultDisplay,
  shouldShowEventResults,
  userHasParticipantRow,
} from '../../lib/events';
import {
  canCancelEvent,
  canDeleteDraft,
  canEditEvent,
  canLeaveRegistration,
  canSubmitEventResults,
  eventHasStarted,
  isEventFinalized,
  isPublishedToDiscord,
  isRegistrationOpen,
} from '../../lib/eventSpec';
import {formatEventStart} from '../../lib/datetime';
import {LOBBY_TOTAL_PLAYERS} from '../../lib/constants';
import {supportsBrowserOAuth} from '../../lib/runtime';
import {resolveConvoyLeader, resolveRegisteredDrivers} from '../../lib/eventRoster';
import type {RosterConvoyLeader} from '../../lib/eventRoster';
import type {AppUser, EventStatus, ForzaEvent} from '../../lib/types';

export type EventDetailViewModel = {
  ev: ForzaEvent;
  isHost: boolean;
  isDraft: boolean;
  canEnterResults: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canDelete: boolean;
  joined: boolean;
  isInParticipants: boolean;
  registrationOpen: boolean;
  canLeave: boolean;
  started: boolean;
  full: boolean;
  showDraftActions: boolean;
  showHostPostStartActions: boolean;
  when: string;
  fillPct: number;
  finalized: boolean;
  resultDisplay: ReturnType<typeof resolveEventResultDisplay>;
  convoyLeader: RosterConvoyLeader | null;
  registeredDrivers: ReturnType<typeof resolveRegisteredDrivers>;
  showResultsSection: boolean;
  showRegistrationProgress: boolean;
  resultsAwaitingHost: boolean;
  showParticipantActions: boolean;
  needsSignInToParticipate: boolean;
  participationBusy: boolean;
  participationAction: 'leaving' | 'joining' | null;
  isCurrentConvoyLeader: boolean;
  participationDisabled: boolean;
  showJoinXboxHint: boolean;
};

export function buildEventDetailViewModel(input: {
  event: ForzaEvent;
  displayEvent: ForzaEvent;
  displayStatus: EventStatus;
  user: AppUser;
  resultRows: EventResultRow[];
  isJoined: (event: ForzaEvent) => boolean;
  isSignedIn: boolean;
  isStandalone: boolean;
  authInitializing: boolean;
  joining: boolean;
  leaving: boolean;
  cancelling: boolean;
  t: TFunction;
}): EventDetailViewModel {
  const {
    event,
    displayEvent: ev,
    displayStatus,
    user,
    resultRows,
    isJoined,
    isSignedIn,
    isStandalone,
    authInitializing,
    joining,
    leaving,
    cancelling,
    t,
  } = input;

  const isHost = ev.hostDiscordId === user.discordId;
  const isDraft = !isPublishedToDiscord(event);
  const canEnterResults = canSubmitEventResults(event, user);
  const canEdit = canEditEvent(event, user);
  const canCancel = canCancelEvent(event, user);
  const canDelete = canDeleteDraft(event, user);
  const joined = isJoined(event);
  const isInParticipants = userHasParticipantRow(ev, user);
  const registrationOpen = isRegistrationOpen(ev);
  const canLeave = canLeaveRegistration(ev);
  const started = eventHasStarted(ev);
  const full = displayStatus === 'full';
  const showDraftActions = isDraft && isHost;
  const showHostPostStartActions = isHost && started && (canEnterResults || canCancel);
  const when = formatEventStart(ev.startsAt);
  const fillPct = Math.round((ev.currentPlayers / LOBBY_TOTAL_PLAYERS) * 100);
  const finalized = isEventFinalized(event);
  const resultDisplay = resolveEventResultDisplay(
    event,
    resultRows,
    t('results.unknownDriver'),
  );
  const convoyLeader = resolveConvoyLeader(ev, user.discordId);
  const registeredDrivers = resolveRegisteredDrivers(ev.participants);
  /** Lifecycle from server row — not `displayEvent` (lobby patch only). */
  const showResultsSection = shouldShowEventResults(event);
  const showRegistrationProgress =
    !showResultsSection && event.lifecycle !== 'cancelled' && isRegistrationOpen(ev);
  const resultsAwaitingHost =
    showResultsSection &&
    !isEventSuccessfullyCompleted(event) &&
    resultDisplay.length === 0;
  const showParticipantActions = !isHost && !isDraft;
  const needsSignInToParticipate =
    showParticipantActions &&
    !isSignedIn &&
    !authInitializing &&
    (supportsBrowserOAuth() || !isStandalone);
  const participationBusy = joining || leaving;
  const participationAction = leaving ? 'leaving' : joining ? 'joining' : null;
  const isCurrentConvoyLeader = convoyLeader?.isYou ?? false;
  const participationDisabled =
    !isSignedIn ||
    participationBusy ||
    cancelling ||
    isCurrentConvoyLeader ||
    (joined ? !canLeave : isInParticipants || !registrationOpen || full);
  const showJoinXboxHint =
    (joined || isInParticipants) &&
    !isHost &&
    !isDraft &&
    !finalized &&
    !started &&
    convoyLeader != null &&
    !convoyLeader.isYou;

  return {
    ev,
    isHost,
    isDraft,
    canEnterResults,
    canEdit,
    canCancel,
    canDelete,
    joined,
    isInParticipants,
    registrationOpen,
    canLeave,
    started,
    full,
    showDraftActions,
    showHostPostStartActions,
    when,
    fillPct,
    finalized,
    resultDisplay,
    convoyLeader,
    registeredDrivers,
    showResultsSection,
    showRegistrationProgress,
    resultsAwaitingHost,
    showParticipantActions,
    needsSignInToParticipate,
    participationBusy,
    participationAction,
    isCurrentConvoyLeader,
    participationDisabled,
    showJoinXboxHint,
  };
}
