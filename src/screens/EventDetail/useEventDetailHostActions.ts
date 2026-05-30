import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {cancelEvent, deleteDraftEvent, isApiConfigured} from '../../lib/api';
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
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'cancel' | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      if (isApiConfigured()) {
        await cancelEvent(token, event.id);
      }
      bumpRefresh();
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('eventDetail.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  }

  async function handleDeleteDraft() {
    if (!event) return;
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setActionError(t('auth.signInDiscordDelete'));
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      if (isApiConfigured()) {
        await deleteDraftEvent(token, event.id);
      }
      bumpRefresh();
      navigate('/my-events', {replace: true});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('eventDetail.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  return {
    cancelling,
    deleting,
    confirmAction,
    setConfirmAction,
    actionError,
    handleCancelEvent,
    handleDeleteDraft,
  };
}
