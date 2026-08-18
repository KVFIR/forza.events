import {useCallback, useId, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {NotificationDmSetupDialog} from './NotificationDmSetupDialog';
import {Button} from './ui/Button';
import {useAuth} from '../context/AuthContext';
import {useNotificationDmReachability} from '../hooks/useNotificationDmReachability';
import {isApiConfigured, updateProfile} from '../lib/api';
import {track} from '../lib/analytics';
import {saveDiscordSession} from '../lib/discordAuth';
import {isStandaloneBrowser} from '../lib/discord';
import {busyLabel} from '../i18n/busyLabels';

/** Survives SPA remounts; a full reload clears it so the hint does not return. */
let showEnabledHint = false;

/** Browse opt-in: Discord DM when a new event is published. Same pref as Profile. Signed-in only. */
export function NewEventAlertsBanner() {
  const {t} = useTranslation();
  const leadId = useId();
  const {
    user,
    refreshUser,
    getAccessToken,
    isConfigured,
    isSignedIn,
    loading: authLoading,
    authRetrying,
  } = useAuth();
  const token = getAccessToken();
  const prefOn = user.newEventNotificationsEnabled === true;
  const {reachable, checked, recheck} = useNotificationDmReachability(
    isSignedIn ? token : null,
    false,
  );
  const [saving, setSaving] = useState(false);
  const [botBlockedOpen, setBotBlockedOpen] = useState(false);
  const [justEnabled, setJustEnabled] = useState(showEnabledHint);
  const subscribed = prefOn && justEnabled;

  const persist = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const ok = checked && reachable ? true : await recheck({fresh: true});
      if (!ok) {
        setBotBlockedOpen(true);
        return;
      }
      if (!isApiConfigured()) {
        refreshUser({...user, newEventNotificationsEnabled: true});
        showEnabledHint = true;
        setJustEnabled(true);
        return;
      }
      const {user: updated} = await updateProfile(token, {
        new_event_notifications_enabled: true,
      });
      refreshUser(updated);
      if (isStandaloneBrowser()) {
        saveDiscordSession({accessToken: token, user: updated});
      }
      track('notification_new_event_enable', {outcome: 'success'});
      showEnabledHint = true;
      setJustEnabled(true);
    } finally {
      setSaving(false);
    }
  }, [token, checked, reachable, recheck, refreshUser, user]);

  if (!isConfigured || authLoading || !isSignedIn) return null;
  if (prefOn && !justEnabled) return null;

  const busy = saving || authRetrying;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-white/10 px-3 py-2">
        <p
          id={leadId}
          className="min-w-0 flex-1 text-xs leading-snug text-slate-300"
          role={subscribed ? 'status' : undefined}
        >
          {subscribed
            ? t('notifications.newEventsBrowseEnabledHint')
            : t('notifications.newEventsBrowseLead')}
        </p>
        <Button
          variant={subscribed ? 'success' : 'open'}
          size="toolbar"
          className="h-7 shrink-0 px-2.5 py-0"
          disabled={busy || subscribed}
          aria-busy={busy}
          aria-describedby={leadId}
          onClick={() => {
            if (subscribed) return;
            void persist();
          }}
        >
          {busy
            ? busyLabel('saving')
            : subscribed
              ? t('notifications.newEventsBrowseSubscribed')
              : t('notifications.newEventsBrowseSubscribe')}
        </Button>
      </div>
      {subscribed ? null : (
        <NotificationDmSetupDialog
          open={botBlockedOpen}
          source="notification_new_event_enable"
          onClose={() => setBotBlockedOpen(false)}
        />
      )}
    </>
  );
}
