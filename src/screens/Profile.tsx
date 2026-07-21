import {useState, useEffect, useRef, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {LanguageToggle} from '../components/LanguageToggle';
import {NotificationBellToggle} from '../components/NotificationBellToggle';
import {ProfileLegalLinks} from '../components/legal/ProfileLegalLinks';
import {TextButton, TextLink} from '../components/ui/TextButton';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {isApiConfigured, updateProfile} from '../lib/api';
import {GamertagModal} from '../components/GamertagModal';
import {EventCard} from '../components/EventCard';
import {useMyEventsCatalog} from '../hooks/useMyEventsCatalog';
import {useNotificationDmReachability} from '../hooks/useNotificationDmReachability';
import {useParticipantResults} from '../hooks/useParticipantResults';
import {isEventSuccessfullyCompleted} from '../lib/eventSpec';
import {formatDiscordHandle} from '../lib/discordHandle';
import {hasGamertag} from '../lib/gamertag';
import {isLocalDevHost} from '../lib/runtime';
import {isStandaloneBrowser, getGuildContext} from '../lib/discord';
import {buildBotInstallUrl, openBotInstallUrl} from '../lib/discordInstall';
import {saveDiscordSession} from '../lib/discordAuth';
import {SignInRequiredState} from '../components/SignInRequiredState';
import {ContentReveal} from '../components/ui/ContentReveal';
import {EmptyState} from '../components/ui/EmptyState';
import {PageLoading} from '../components/ui/PageLoading';
import {Alert} from '../components/ui/Alert';
import {StatCard} from '../components/ui/StatCard';
import {UserAvatar} from '../components/UserAvatar';
import type {AppLanguage} from '../i18n';
import {track} from '../lib/analytics';
import {cn} from '../lib/cn';
import {notificationToggleActive} from '../lib/notificationDm';

export function Profile() {
  const {t, i18n} = useTranslation();
  const {
    user,
    refreshUser,
    getAccessToken,
    isConfigured,
    isSignedIn,
    isStandalone,
    loading: authInitializing,
    authRetrying,
    retryDiscordAuth,
  } = useAuth();
  const {isJoined} = useJoinedEvents();
  const {allMine, active, isLoading, loadError, refetch} = useMyEventsCatalog('all');
  const [editGamertag, setEditGamertag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [dmEnableBlockedOpen, setDmEnableBlockedOpen] = useState(false);
  const localeSyncedRef = useRef(false);
  const dmReachableRef = useRef(false);
  const dmRecheckingRef = useRef(false);
  const token = getAccessToken();
  const notificationsPrefEnabled = user.dmNotificationsEnabled !== false;
  const {
    reachable: dmReachable,
    loading: dmReachabilityLoading,
    checked: dmReachabilityChecked,
    recheck: recheckDmReachability,
  } = useNotificationDmReachability(isSignedIn ? token : null);
  dmReachableRef.current = dmReachable;
  const notificationsActive = notificationToggleActive(
    notificationsPrefEnabled,
    dmReachabilityChecked,
    dmReachable,
  );
  const needsGamertag = !hasGamertag(user.xboxGamertag);
  const participatedCompleted = allMine.filter(
    (e) => isJoined(e) && isEventSuccessfullyCompleted(e),
  );
  const recentCompleted = participatedCompleted.slice(0, 3);
  const placementIds = participatedCompleted.map((e) => e.id);
  const participantPlacements = useParticipantResults(placementIds, user.discordId);
  const hostedCount = allMine.filter(
    (e) => e.hostDiscordId === user.discordId && isEventSuccessfullyCompleted(e),
  ).length;
  const participatedCount = participatedCompleted.length;

  const syncProfilePrefs = useCallback(async (
    updates: {dm_notifications_enabled?: boolean; notification_locale?: AppLanguage},
  ) => {
    if (!token || !isApiConfigured()) {
      refreshUser({
        ...user,
        ...(updates.dm_notifications_enabled !== undefined
          ? {dmNotificationsEnabled: updates.dm_notifications_enabled}
          : {}),
        ...(updates.notification_locale !== undefined
          ? {notificationLocale: updates.notification_locale}
          : {}),
      });
      return;
    }
    setSavingNotifications(true);
    try {
      const {user: updated} = await updateProfile(token, updates);
      refreshUser(updated);
      if (isStandaloneBrowser()) {
        saveDiscordSession({accessToken: token, user: updated});
      }
      if (updates.dm_notifications_enabled === true) {
        track('notification_dm_enable', {outcome: 'success'});
      } else if (updates.dm_notifications_enabled === false) {
        track('notification_dm_disable', {outcome: 'success'});
      }
    } finally {
      setSavingNotifications(false);
    }
  }, [token, user, refreshUser]);

  useEffect(() => {
    if (!isSignedIn || !token || !isApiConfigured()) return;
    void updateProfile(token, {})
      .then(({user: updated}) => {
        refreshUser(updated);
        if (isStandaloneBrowser()) {
          saveDiscordSession({accessToken: token, user: updated});
        }
      })
      .catch(() => {
        // ponytail: profile stats still work from local event list
      });
  }, [isSignedIn, token, refreshUser]);

  useEffect(() => {
    if (!isSignedIn || !token || localeSyncedRef.current) return;
    const uiLng = (i18n.language.split('-')[0] === 'ru' ? 'ru' : 'en') as AppLanguage;
    if (user.notificationLocale === uiLng) {
      localeSyncedRef.current = true;
      return;
    }
    void syncProfilePrefs({notification_locale: uiLng}).finally(() => {
      localeSyncedRef.current = true;
    });
  }, [isSignedIn, token, i18n.language, user.notificationLocale, syncProfilePrefs]);

  useEffect(() => {
    if (!isSignedIn || !token) return;

    const recheckIfNeeded = () => {
      if (document.visibilityState !== 'visible') return;
      if (dmReachableRef.current || dmRecheckingRef.current) return;
      dmRecheckingRef.current = true;
      void recheckDmReachability({fresh: true}).finally(() => {
        dmRecheckingRef.current = false;
      });
    };

    window.addEventListener('visibilitychange', recheckIfNeeded);
    window.addEventListener('focus', recheckIfNeeded);
    return () => {
      window.removeEventListener('visibilitychange', recheckIfNeeded);
      window.removeEventListener('focus', recheckIfNeeded);
    };
  }, [isSignedIn, token, recheckDmReachability]);

  if (isConfigured && !isSignedIn && !authInitializing) {
    if (isStandalone && isLocalDevHost()) {
      return (
        <SignInRequiredState
          description={t('auth.signInProfile')}
          className="pb-10 pt-5"
        />
      );
    }
    if (!isStandalone) {
      return (
        <SignInRequiredState
          description={t('auth.signInProfile')}
          busy={authRetrying}
          onRetry={() => void retryDiscordAuth()}
          className="pb-10 pt-5"
        />
      );
    }
  }

  if (isLoading) {
    return <PageLoading label={t('loading.profile')} className="pb-10 pt-5" />;
  }

  if (loadError) {
    return (
      <ContentReveal>
        <EmptyState
          icon="⚠️"
          title={t('profile.loadErrorTitle')}
          description={t('profile.loadErrorDesc')}
          action={{label: t('common.tryAgain'), onClick: refetch}}
          className="min-h-[40vh] py-20"
        />
      </ContentReveal>
    );
  }

  async function handleSaveGamertag(gamertag: string) {
    if (!token || !isApiConfigured()) {
      refreshUser({...user, xboxGamertag: gamertag});
      setEditGamertag(false);
      return;
    }
    setSaving(true);
    try {
      const {user: updated} = await updateProfile(token, {xbox_gamertag: gamertag});
      refreshUser(updated);
      setEditGamertag(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ContentReveal className="pb-10 pt-5">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(139,92,246,0.12)_0%,transparent_70%)]" />
        <div className="relative flex items-center gap-4 p-5 pr-14">
          <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
            <LanguageToggle
              onLanguageSelect={(lng) => {
                if (!isSignedIn) return;
                void syncProfilePrefs({notification_locale: lng});
              }}
            />
          </div>
          <UserAvatar
            src={user.avatarUrl}
            name={user.username}
            size="lg"
            variant="profile"
            className="rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black tracking-tight text-white">
              {formatDiscordHandle(user.username)}
            </p>
            <p className="mt-0.5 text-xs text-muted-light">
              {t('profile.xboxGt')}{' '}
              <span className={cn('font-semibold', needsGamertag ? 'text-amber-300' : 'text-slate-300')}>
                {user.xboxGamertag ?? t('common.notSet')}
              </span>
            </p>
            <TextButton type="button" className="mt-2" onClick={() => setEditGamertag(true)}>
              {user.xboxGamertag ? t('profile.editGamertag') : t('profile.addGamertag')}
            </TextButton>
          </div>
        </div>
        {isSignedIn ? (
          <div className="relative border-t border-white/[0.06] px-5 py-3">
            <NotificationBellToggle
              enabled={notificationsActive}
              disabled={savingNotifications || (dmReachabilityLoading && !dmReachabilityChecked)}
              onChange={(next) => {
                if (savingNotifications) return;
                if (!next) {
                  void syncProfilePrefs({dm_notifications_enabled: false});
                  return;
                }
                void (async () => {
                  setSavingNotifications(true);
                  try {
                    const ok =
                      dmReachabilityChecked && dmReachable
                        ? true
                        : await recheckDmReachability({fresh: true});
                    if (!ok) {
                      setDmEnableBlockedOpen(true);
                      return;
                    }
                    if (!notificationsPrefEnabled) {
                      await syncProfilePrefs({dm_notifications_enabled: true});
                    }
                  } finally {
                    setSavingNotifications(false);
                  }
                })();
              }}
            />
          </div>
        ) : null}
      </div>

      {needsGamertag ? (
        <Alert variant="warning" className="mt-3">
          {t('profile.gamertagWarning')}
        </Alert>
      ) : null}

      <div className="mt-4 flex gap-2">
        <StatCard label={t('profile.hosted')} value={hostedCount} />
        <StatCard label={t('profile.participated')} value={participatedCount} />
        <StatCard
          label={t('profile.rating')}
          value={
            user.driverRating && user.driverRating.gamesRated > 0
              ? user.driverRating.rating
              : t('profile.ratingTbd')
          }
        />
      </div>
      <div className="mt-2">
        <TextLink to="/leaderboard" className="text-[11px]">
          {t('profile.viewLeaderboard')}
        </TextLink>
      </div>

      {recentCompleted.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted">{t('profile.recentResults')}</p>
            <TextLink to="/my-events" className="text-[11px]">
              {t('profile.allInMyEvents')}
            </TextLink>
          </div>
          <ul className="flex list-none flex-col gap-2">
            {recentCompleted.map((event) => (
              <li key={event.id}>
                <EventCard
                  event={event}
                  participantResult={participantPlacements.get(event.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section className="mt-6">
          <p className="mb-3 text-[11px] font-medium text-muted">{t('profile.upcoming')}</p>
          <ul className="flex list-none flex-col gap-2">
            {active.slice(0, 2).map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isConfigured ? (
        <p className="mt-6 text-center text-[10px] text-muted">{t('profile.supabaseHint')}</p>
      ) : null}

      <ProfileLegalLinks />

      <GamertagModal
        open={editGamertag}
        initialValue={user.xboxGamertag ?? ''}
        saving={saving}
        onSave={handleSaveGamertag}
        onClose={() => setEditGamertag(false)}
      />

      <ConfirmDialog
        open={dmEnableBlockedOpen}
        title={t('notifications.dmEnableBlockedTitle')}
        description={t('notifications.dmSetupBody')}
        confirmLabel={t('publish.addBot')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDmEnableBlockedOpen(false)}
        onConfirm={() => {
          setDmEnableBlockedOpen(false);
          if (!buildBotInstallUrl()) return;
          track('bot_install_click', {meta: {source: 'notification_dm_enable'}});
          const {guildId} = getGuildContext();
          void openBotInstallUrl(guildId ? {guildId} : undefined);
        }}
      />
    </ContentReveal>
  );
}
