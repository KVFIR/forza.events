import type {TFunction} from 'i18next';
import type {EventResultRow} from '../../lib/events';
import {
  isEventSuccessfullyCompleted,
  resolveEventResultDisplay,
  shouldShowEventResults,
  userHasParticipantRow,
} from '../../lib/events';
import {
  canAddGroup,
  canCancelEvent,
  canEditEvent,
  canLeaveRegistration,
  canSubmitEventResults,
  eventHasStarted,
  isEventFinalized,
  isPublishedToDiscord,
  isRegistrationOpen,
  lobbyIsFull,
  totalCapacity,
  waitlistCount,
} from '../../lib/eventSpec';
import {formatEventStart} from '../../lib/datetime';
import {supportsBrowserOAuth} from '../../lib/runtime';
import {
  resolveConvoyLeader,
  resolveEventGroups,
  resolveRegisteredDrivers,
  resolveViewerConvoyLeader,
  resolveWaitlist,
  viewerIsConvoyLeader,
} from '../../lib/eventRoster';
import type {RosterConvoyLeader, RosterGroup} from '../../lib/eventRoster';
import type {AppUser, EventParticipant, EventStatus, ForzaEvent} from '../../lib/types';

export type EventDetailViewModel = {
  ev: ForzaEvent;
  isHost: boolean;
  isDraft: boolean;
  canEnterResults: boolean;
  canEdit: boolean;
  canCancel: boolean;
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
  viewerConvoyLeader: RosterConvoyLeader | null;
  registeredDrivers: ReturnType<typeof resolveRegisteredDrivers>;
  groups: RosterGroup[];
  waitlist: EventParticipant[];
  waitlistCount: number;
  totalCapacity: number;
  canAddGroup: boolean;
  onWaitlist: boolean;
  willWaitlist: boolean;
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
  showConvoyLeaderXboxHint: boolean;
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
  const joined = isJoined(event);
  const isInParticipants = userHasParticipantRow(ev, user);
  const registrationOpen = isRegistrationOpen(ev);
  const canLeave = canLeaveRegistration(ev);
  const started = eventHasStarted(ev);
  const full = displayStatus === 'full';
  const showDraftActions = isDraft && isHost;
  const showHostPostStartActions = isHost && started && (canEnterResults || canCancel);
  const when = formatEventStart(ev.startsAt);
  const capacity = totalCapacity(ev);
  const fillPct = Math.round((ev.currentPlayers / capacity) * 100);
  const finalized = isEventFinalized(event);
  const resultDisplay = resolveEventResultDisplay(
    event,
    resultRows,
    t('results.unknownDriver'),
  );
  const convoyLeader = resolveConvoyLeader(ev, user.discordId);
  const viewerConvoyLeader = resolveViewerConvoyLeader(ev, user.discordId);
  const registeredDrivers = resolveRegisteredDrivers(ev.participants);
  const groups = resolveEventGroups(ev, user.discordId);
  const waitlist = resolveWaitlist(ev.participants);
  const viewerRow = ev.participants.find((p) => p.discordId === user.discordId);
  const onWaitlist = viewerRow?.waitlisted ?? false;
  const willWaitlist = !isInParticipants && lobbyIsFull(ev);
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
  const isCurrentConvoyLeader = viewerIsConvoyLeader(ev, user.discordId);
  const participationDisabled =
    !isSignedIn ||
    participationBusy ||
    cancelling ||
    isCurrentConvoyLeader ||
    (isInParticipants && !joined && !onWaitlist) ||
    // Active seat or waitlist → leave; otherwise join (or join-waitlist when full).
    (joined || onWaitlist ? !canLeave : !registrationOpen);
  const showJoinXboxHint =
    joined &&
    !onWaitlist &&
    !isHost &&
    !isDraft &&
    !finalized &&
    !started &&
    viewerConvoyLeader != null &&
    !viewerConvoyLeader.isYou;
  const showConvoyLeaderXboxHint =
    isCurrentConvoyLeader &&
    !onWaitlist &&
    !isDraft &&
    !finalized &&
    !started;

  return {
    ev,
    isHost,
    isDraft,
    canEnterResults,
    canEdit,
    canCancel,
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
    viewerConvoyLeader,
    registeredDrivers,
    groups,
    waitlist,
    waitlistCount: waitlistCount(ev),
    totalCapacity: capacity,
    canAddGroup: canAddGroup(ev, user),
    onWaitlist,
    willWaitlist,
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
    showConvoyLeaderXboxHint,
  };
}
