import {useTranslation} from 'react-i18next';
import {busyLabel} from '../../i18n/busyLabels';
import {Button} from '../../components/ui/Button';
import {ConfirmDialog} from '../../components/ui/ConfirmDialog';
import {PublishTargetModal} from '../../components/PublishTargetPicker';
import {FormAlerts, StepIndicator} from './components/StepIndicator';
import {PublishedTargetSummary} from './components/PublishedTargetSummary';
import {PUBLISH_STEP_INDEX} from './constants';
import {useEffect, useRef, useState} from 'react';
import {useCreateEventForm} from './useCreateEventForm';
import {EventStep} from './steps/EventStep';
import {PublishStep} from './steps/PublishStep';
import {SignInRequiredState} from '../../components/SignInRequiredState';
import {ContentReveal} from '../../components/ui/ContentReveal';
import {PageLoading} from '../../components/ui/PageLoading';
import {GamertagModal} from '../../components/GamertagModal';
import {isApiConfigured, updateProfile} from '../../lib/api';
import {useAuth} from '../../context/AuthContext';
import {useRichPresenceOverride} from '../../context/DiscordRichPresenceContext';
import {buildCreateRichPresence} from '../../lib/discordRichPresence';
import {useLoadingUI} from '../../hooks/useLoadingUI';
import {isLocalDevHost} from '../../lib/runtime';

export function CreateEvent() {
  const {t} = useTranslation();
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [editNotifyConfirmOpen, setEditNotifyConfirmOpen] = useState(false);
  const [gamertagModalOpen, setGamertagModalOpen] = useState(false);
  const [savingGamertag, setSavingGamertag] = useState(false);
  const {refreshUser, isStandalone, loading: authInitializing, authRetrying, retryDiscordAuth} =
    useAuth();
  const form = useCreateEventForm();
  const {setRichPresenceOverride} = useRichPresenceOverride();
  const showLoadingUI = useLoadingUI(form.loadingEdit);

  useEffect(() => {
    setRichPresenceOverride(
      buildCreateRichPresence(form.values.title, Boolean(form.editId)),
    );
    return () => setRichPresenceOverride(null);
  }, [form.values.title, form.editId, setRichPresenceOverride]);
  const {
    user,
    token,
    isConfigured,
    isSignedIn,
    canPersist,
    step,
    setStep,
    fieldErrors,
    globalError,
    saving,
    editId,
    eventId,
    setEventId,
    showPublishModal,
    setShowPublishModal,
    isPublished,
    wouldNotifyRacersOnSave,
    values,
    tryContinue,
    onCoverChange,
    persistDraft,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    requestDeleteDraft,
    confirmDeleteDraft,
    cancelConfirmOpen,
    setCancelConfirmOpen,
    canCancelPublished,
    requestCancelPublished,
    confirmCancelPublished,
    confirmPublish,
    validateBeforePublish,
    navigate,
    setTitle,
    setType,
    setStartsAtLocal,
    setDescription,
    setTracks,
    setCarRuleMode,
    setMaxPi,
    setAdditionalCarRestrictions,
    setEventCars,
    lobbyLeaderSelection,
    setLobbyLeaderIsHost,
    setLobbyLeaderGamertag,
    onLobbyLeaderSelect,
    onGuildChange,
    setTargetChannelId,
    clearFieldError,
  } = form;

  const hasDraftId = Boolean(eventId);
  const draftFlow = !isPublished;

  async function handleSaveHostGamertag(gamertag: string) {
    if (!token || !isApiConfigured()) {
      refreshUser({...user, xboxGamertag: gamertag});
      setLobbyLeaderGamertag(gamertag);
      clearFieldError('lobbyLeaderGamertag');
      setGamertagModalOpen(false);
      return;
    }
    setSavingGamertag(true);
    try {
      const {user: updated} = await updateProfile(token, {xbox_gamertag: gamertag});
      refreshUser(updated);
      setLobbyLeaderGamertag(gamertag);
      clearFieldError('lobbyLeaderGamertag');
      setGamertagModalOpen(false);
    } finally {
      setSavingGamertag(false);
    }
  }

  async function handleSaveDraft() {
    const id = await persistDraft();
    if (!id) return;
    navigate(`/event/${id}`, {replace: true, state: {from: '/my-events'}});
  }

  function requestSaveChanges() {
    if (wouldNotifyRacersOnSave) {
      setEditNotifyConfirmOpen(true);
      return;
    }
    void handleSaveChanges();
  }

  async function handleSaveChanges() {
    const id = await persistDraft();
    if (!id) return;
    navigate(isPublished ? `/event/${id}` : '/my-events', {
      replace: true,
      ...(isPublished ? {state: {from: '/my-events'}} : {}),
    });
  }

  async function handlePublishClick() {
    if (!validateBeforePublish()) return;
    if (!values.targetChannelId) {
      setShowPublishModal(true);
      return;
    }
    setPublishConfirmOpen(true);
  }

  const publishingRef = useRef(false);

  async function executePublish() {
    if (publishingRef.current) return;
    publishingRef.current = true;
    try {
      const id = await persistDraft();
      if (!id || !token) return;
      setEventId(id);
      await confirmPublish(id);
    } finally {
      publishingRef.current = false;
    }
  }

  function onPublishModalConfirm() {
    void (async () => {
      if (!validateBeforePublish()) {
        setShowPublishModal(false);
        return;
      }
      const id = await persistDraft();
      if (!id) return;
      if (!values.targetChannelId) return;
      await confirmPublish(id);
    })();
  }

  if (showLoadingUI) {
    return <PageLoading label={t('loading.event')} className="pb-10 pt-5" />;
  }

  if (form.loadingEdit) {
    return <PageLoading label={t('loading.event')} className="pb-10 pt-5" />;
  }

  if (isConfigured && !isSignedIn && !authInitializing && (!isStandalone || editId)) {
    return (
      <SignInRequiredState
        description={t('auth.signInCreate')}
        busy={authRetrying}
        onRetry={() => void retryDiscordAuth()}
        className="pb-10 pt-5"
      />
    );
  }

  const eventStepProps = {
    values,
    fieldErrors,
    onTitle: setTitle,
    onType: setType,
    onStartsAtLocal: setStartsAtLocal,
    onDescription: setDescription,
    onCoverChange,
    onTracks: setTracks,
    onCarRuleMode: setCarRuleMode,
    onMaxPi: setMaxPi,
    onAdditionalCarRestrictions: setAdditionalCarRestrictions,
    onEventCars: setEventCars,
    editSessionKey: editId ?? eventId,
  };

  const convoySectionProps = {
    accessToken: token ?? '',
    guildId: values.targetGuildId,
    guildName: values.targetGuildName,
    hostDiscordId: user.discordId,
    hostGamertag: user.xboxGamertag,
    lobbyLeaderIsHost: values.lobbyLeaderIsHost,
    lobbyLeaderSelection,
    lobbyLeaderGamertag: values.lobbyLeaderGamertag,
    fieldErrors,
    onLobbyLeaderIsHost: setLobbyLeaderIsHost,
    onLobbyLeaderSelect,
    onLobbyLeaderGamertag: setLobbyLeaderGamertag,
    onAddHostGamertag: () => setGamertagModalOpen(true),
  };

  return (
    <ContentReveal className="pb-10 pt-5">
      {!isPublished && (
        <StepIndicator
          step={step}
          freeNavigation={hasDraftId || isLocalDevHost()}
          onStepClick={setStep}
        />
      )}

      <FormAlerts
        isConfigured={isConfigured}
        isSignedIn={isSignedIn}
        authInitializing={authInitializing}
        globalError={globalError}
      />

      {isPublished ? (
        <div className="space-y-3">
          <EventStep {...eventStepProps} />
          <PublishedTargetSummary
            guildName={values.targetGuildName}
            hasChannel={Boolean(values.targetChannelId)}
          />
        </div>
      ) : step === 0 ? (
        <EventStep {...eventStepProps} />
      ) : (
        <PublishStep
          token={token}
          accessToken={token ?? ''}
          guildId={values.targetGuildId}
          guildName={values.targetGuildName}
          channelId={values.targetChannelId}
          lockGuild={false}
          lockChannel={false}
          fieldErrors={fieldErrors}
          convoy={convoySectionProps}
          onGuildChange={onGuildChange}
          onChannelChange={setTargetChannelId}
        />
      )}

      <div className="mt-8 flex flex-col gap-2">
        {isPublished && (
          <>
            <Button
              variant="primary"
              fullWidth
              disabled={saving || !canPersist}
              onClick={() => void requestSaveChanges()}
            >
              {saving ? busyLabel('saving') : t('create.saveChanges')}
            </Button>
            {canCancelPublished ? (
              <Button
                variant="danger"
                fullWidth
                disabled={saving || !canPersist}
                onClick={requestCancelPublished}
              >
                {t('eventDetail.cancelEvent')}
              </Button>
            ) : null}
          </>
        )}

        {!isPublished && step === 0 && (
          <>
            <Button variant="primary" fullWidth onClick={() => tryContinue()}>
              {t('create.continueToPublish')}
            </Button>
            {canPersist && (
              <Button
                variant="secondary"
                fullWidth
                disabled={saving}
                onClick={() => void handleSaveDraft()}
              >
                {saving ? busyLabel('saving') : t('create.saveAsDraft')}
              </Button>
            )}
          </>
        )}

        {!isPublished && step === PUBLISH_STEP_INDEX && draftFlow && (
          <>
            <Button
              variant="primary"
              fullWidth
              disabled={saving || !canPersist}
              onClick={() => void handlePublishClick()}
            >
              {saving ? busyLabel('working') : t('create.publishEvent')}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={saving || !canPersist}
              onClick={() => void handleSaveDraft()}
            >
              {saving ? busyLabel('saving') : t('create.saveAsDraft')}
            </Button>
            {hasDraftId && (
              <Button
                variant="danger"
                fullWidth
                disabled={saving || !canPersist}
                onClick={requestDeleteDraft}
              >
                {t('eventDetail.deleteDraft')}
              </Button>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={editNotifyConfirmOpen}
        title={t('notifications.editNotifyTitle')}
        description={t('notifications.editNotifyBody')}
        confirmLabel={t('notifications.editNotifyConfirm')}
        cancelLabel={t('notifications.editNotifyCancel')}
        busy={saving}
        onCancel={() => setEditNotifyConfirmOpen(false)}
        onConfirm={() => {
          setEditNotifyConfirmOpen(false);
          void handleSaveChanges();
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('eventDetail.deleteDraftTitle')}
        description={t('eventDetail.deleteDraftDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        busy={saving}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void confirmDeleteDraft()}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title={t('eventDetail.cancelEventTitle')}
        description={t('eventDetail.cancelEventDesc')}
        confirmLabel={t('eventDetail.cancelEvent')}
        variant="danger"
        busy={saving}
        onCancel={() => setCancelConfirmOpen(false)}
        onConfirm={() => void confirmCancelPublished()}
      />

      <ConfirmDialog
        open={publishConfirmOpen}
        title={t('create.publishEventTitle')}
        description={t('create.publishEventDesc')}
        confirmLabel={t('create.publish')}
        busy={saving}
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={() => {
          setPublishConfirmOpen(false);
          void executePublish();
        }}
      />

      <GamertagModal
        open={gamertagModalOpen}
        initialValue={user.xboxGamertag ?? ''}
        saving={savingGamertag}
        submitLabel={t('gamertag.save')}
        description={t('gamertag.modalBodyCreate')}
        onSave={(gt) => void handleSaveHostGamertag(gt)}
        onClose={() => setGamertagModalOpen(false)}
      />

      {showPublishModal && token && (
        <PublishTargetModal
          accessToken={token}
          guildId={values.targetGuildId}
          guildName={values.targetGuildName}
          channelId={values.targetChannelId}
          onGuildChange={onGuildChange}
          onChannelChange={setTargetChannelId}
          onCancel={() => setShowPublishModal(false)}
          confirming={saving}
          onConfirm={onPublishModalConfirm}
        />
      )}
    </ContentReveal>
  );
}
