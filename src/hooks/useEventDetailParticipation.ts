import {useCallback, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {useAuth} from '../context/AuthContext';
import {canLeaveRegistration} from '../lib/eventSpec';
import {viewerIsConvoyLeader} from '../lib/eventRoster';
import {startDiscordBrowserSignIn} from '../lib/discordBrowserSignIn';
import {hasGamertag, gamertagError} from '../lib/gamertag';
import {supportsBrowserOAuth} from '../lib/runtime';
import {userHasParticipantRow} from '../lib/events';
import type {ForzaEvent} from '../lib/types';

export function useEventDetailParticipation(
  event: ForzaEvent | undefined,
  onParticipationSynced?: () => void,
) {
  const {t} = useTranslation();
  const {isJoined, joinParticipation, leaveParticipation} = useJoinedEvents();
  const {
    user,
    getAccessToken,
    isSignedIn,
    isStandalone,
    retryDiscordAuth,
  } = useAuth();

  const [gamertagOpen, setGamertagOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const participationInFlightRef = useRef(false);

  const doLeave = useCallback(async () => {
    if (!event) return;
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setJoinError(t('auth.signInDiscordJoin'));
      return;
    }

    setLeaving(true);
    setJoinError(null);
    participationInFlightRef.current = true;
    try {
      await leaveParticipation(event);
      onParticipationSynced?.();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : t('eventDetail.leaveFailed'));
    } finally {
      participationInFlightRef.current = false;
      setLeaving(false);
    }
  }, [event, getAccessToken, isSignedIn, leaveParticipation, onParticipationSynced, t]);

  const doJoin = useCallback(
    async (gamertag: string) => {
      if (!event) return;
      const token = getAccessToken();
      if (!isSignedIn || !token) {
        setJoinError(t('auth.signInDiscordJoin'));
        return;
      }
      const trimmed = gamertag.trim();
      const tagErr = gamertagError(trimmed);
      if (tagErr) {
        setJoinError(tagErr);
        setGamertagOpen(true);
        return;
      }
      setJoining(true);
      setJoinError(null);
      participationInFlightRef.current = true;
      try {
        await joinParticipation(event, trimmed);
        onParticipationSynced?.();
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : t('eventDetail.joinFailed'));
      } finally {
        participationInFlightRef.current = false;
        setJoining(false);
        setGamertagOpen(false);
      }
    },
    [event, getAccessToken, isSignedIn, joinParticipation, onParticipationSynced, t],
  );

  const handleJoinClick = useCallback(async () => {
    if (!event) return;
    if (!isSignedIn) {
      if (isStandalone && supportsBrowserOAuth()) {
        startDiscordBrowserSignIn();
        return;
      }
      if (!isStandalone) void retryDiscordAuth();
      return;
    }
    if (viewerIsConvoyLeader(event, user.discordId)) {
      setJoinError(t('errors.leaderCannotLeave'));
      return;
    }
    const onWaitlist =
      event.participants.find((p) => p.discordId === user.discordId)?.waitlisted ?? false;
    if (isJoined(event) || onWaitlist) {
      if (!canLeaveRegistration(event)) {
        setJoinError(t('participation.leaveLockedAfterStart'));
        return;
      }
      await doLeave();
      return;
    }
    if (userHasParticipantRow(event, user)) {
      return;
    }
    if (!hasGamertag(user.xboxGamertag)) {
      setGamertagOpen(true);
      return;
    }
    await doJoin(user.xboxGamertag!.trim());
  }, [
    event,
    isSignedIn,
    isStandalone,
    retryDiscordAuth,
    isJoined,
    doLeave,
    user.discordId,
    user.xboxGamertag,
    doJoin,
    t,
  ]);

  const isParticipationInFlight = useCallback(
    () => participationInFlightRef.current,
    [],
  );

  return {
    gamertagOpen,
    setGamertagOpen,
    joining,
    leaving,
    joinError,
    isParticipationInFlight,
    handleJoinClick,
    doJoin,
  };
}
