import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {cancelEvent, isApiConfigured, retryEventRatings, submitEventResults} from '../../lib/api';
import {track} from '../../lib/analytics';
import {fetchEventById} from '../../lib/events';
import type {ForzaEvent} from '../../lib/types';

export function useEventDetailHostActions(input: {
  event: ForzaEvent | undefined;
  setEvent: (event: ForzaEvent | undefined) => void;
  discordToken: string | null;
  getAccessToken: () => string | null;
  isSignedIn: boolean;
  bumpRefresh: () => void;
}) {
  const {event, setEvent, discordToken, getAccessToken, isSignedIn, bumpRefresh} = input;
  const {t} = useTranslation();
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [retryingRatings, setRetryingRatings] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'complete' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCancelEvent() {
    if (!event) return;
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setActionError(t('auth.signInDiscordCancel'));
      return;
    }
    setCancelling(true);
    setActionError(null);
    try {
      if (!isApiConfigured()) {
        setActionError(t('browse.errorNotConfiguredDesc'));
        return;
      }
      await cancelEvent(token, event.id);
      track('cancel_event', {outcome: 'success', event_id: event.id});
      bumpRefresh();
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('eventDetail.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  }

  async function handleCompleteWithoutResults() {
    if (!event) return;
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setActionError(t('auth.signInRequired'));
      return;
    }
    setCompleting(true);
    setActionError(null);
    try {
      if (!isApiConfigured()) {
        setActionError(t('browse.errorNotConfiguredDesc'));
        return;
      }
      await submitEventResults(token, event.id, []);
      track('submit_results', {outcome: 'success', event_id: event.id, meta: {cruise: true}});
      bumpRefresh();
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('eventDetail.completeFailed'));
    } finally {
      setCompleting(false);
    }
  }

  async function handleRetryRatings() {
    if (!event) return;
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setActionError(t('auth.signInRequired'));
      return;
    }
    setRetryingRatings(true);
    setActionError(null);
    try {
      if (!isApiConfigured()) {
        setActionError(t('browse.errorNotConfiguredDesc'));
        return;
      }
      const res = await retryEventRatings(token, event.id);
      if (!res.rating_applied) {
        setActionError(t('eventDetail.ratingRetryFailed'));
        return;
      }
      track('retry_event_ratings', {outcome: 'success', event_id: event.id});
      bumpRefresh();
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('eventDetail.ratingRetryFailed'));
    } finally {
      setRetryingRatings(false);
    }
  }

  return {
    cancelling,
    completing,
    retryingRatings,
    confirmAction,
    setConfirmAction,
    actionError,
    handleCancelEvent,
    handleCompleteWithoutResults,
    handleRetryRatings,
  };
}
