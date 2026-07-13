import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {cancelEvent, isApiConfigured} from '../../lib/api';
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
  const [confirmAction, setConfirmAction] = useState<'cancel' | null>(null);
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

  return {
    cancelling,
    confirmAction,
    setConfirmAction,
    actionError,
    handleCancelEvent,
  };
}
