import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {NotificationDmSetupDialog} from './NotificationDmSetupDialog';
import {NotificationBellToggle} from './NotificationBellToggle';
import {useAuth} from '../context/AuthContext';
import {useNotificationDmReachability} from '../hooks/useNotificationDmReachability';
import {isApiConfigured, updateProfile} from '../lib/api';
import {track} from '../lib/analytics';
import {saveDiscordSession} from '../lib/discordAuth';
import {isStandaloneBrowser} from '../lib/discord';
import {notificationToggleActive} from '../lib/notificationDm';

/** Browse opt-in: Discord DM when a new event is published. Same pref as Profile. Signed-in only. */
export function NewEventAlertsBanner() {
  const {t} = useTranslation();
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
  const {
    reachable,
    loading: reachabilityLoading,
    checked,
    recheck,
  } = useNotificationDmReachability(isSignedIn ? token : null, prefOn);
  const reachableRef = useRef(reachable);
  const recheckingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [botBlockedOpen, setBotBlockedOpen] = useState(false);
  reachableRef.current = reachable;
  const subscribed = notificationToggleActive(prefOn, checked, reachable);

  useEffect(() => {
    if (!isSignedIn || !token || !prefOn) return;

    const recheckIfNeeded = () => {
      if (document.visibilityState !== 'visible') return;
      if (reachableRef.current || recheckingRef.current) return;
      recheckingRef.current = true;
      void recheck({fresh: true}).finally(() => {
        recheckingRef.current = false;
      });
    };

    window.addEventListener('visibilitychange', recheckIfNeeded);
    window.addEventListener('focus', recheckIfNeeded);
    return () => {
      window.removeEventListener('visibilitychange', recheckIfNeeded);
      window.removeEventListener('focus', recheckIfNeeded);
    };
  }, [isSignedIn, token, recheck, prefOn]);

  const persist = useCallback(async (enabled: boolean) => {
    if (!token) return;
    setSaving(true);
    try {
      if (enabled) {
        const ok = checked && reachable ? true : await recheck({fresh: true});
        if (!ok) {
          setBotBlockedOpen(true);
          return;
        }
      }
      if (!isApiConfigured()) {
        refreshUser({...user, newEventNotificationsEnabled: enabled});
        return;
      }
      const {user: updated} = await updateProfile(token, {
        new_event_notifications_enabled: enabled,
      });
      refreshUser(updated);
      if (isStandaloneBrowser()) {
        saveDiscordSession({accessToken: token, user: updated});
      }
      track(
        enabled ? 'notification_new_event_enable' : 'notification_new_event_disable',
        {outcome: 'success'},
      );
    } finally {
      setSaving(false);
    }
  }, [token, checked, reachable, recheck, refreshUser, user]);

  if (!isConfigured || authLoading || !isSignedIn) return null;

  const busy = saving || authRetrying || (reachabilityLoading && !checked);

  return (
    <>
      <div className="mb-3 rounded-xl border border-white/[0.06] px-3 py-2.5">
        <NotificationBellToggle
          enabled={subscribed}
          disabled={busy}
          label={t('notifications.newEventsProfileLabel')}
          switchOnLabel={t('notifications.newEventsToggleOn')}
          switchOffLabel={t('notifications.newEventsToggleOff')}
          onChange={(next) => {
            if (saving || authRetrying) return;
            void persist(next);
          }}
        />
      </div>
      <NotificationDmSetupDialog
        open={botBlockedOpen}
        source="notification_new_event_enable"
        onClose={() => setBotBlockedOpen(false)}
      />
    </>
  );
}
