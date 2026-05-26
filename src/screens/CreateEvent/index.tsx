import {Button} from '../../components/ui/Button';
import {BUSY_LABEL} from '../../components/ui/buttonStyles';
import {ConfirmDialog} from '../../components/ui/ConfirmDialog';
import {PublishTargetModal} from '../../components/PublishTargetPicker';
import {FormAlerts, StepIndicator} from './components/StepIndicator';
import type {CreateEventStepIndex} from './constants';
import {useState} from 'react';
import {useCreateEventForm} from './useCreateEventForm';
import {BasicsStep} from './steps/BasicsStep';
import {DetailsStep} from './steps/DetailsStep';
import {TargetStep} from './steps/TargetStep';
import {ReviewStep, collectPublishGaps} from './steps/ReviewStep';
import {SignInRequiredState} from '../../components/SignInRequiredState';
import {ContentReveal} from '../../components/ui/ContentReveal';
import {PageLoading} from '../../components/ui/PageLoading';
import {useAuth} from '../../context/AuthContext';
import {useLoadingUI} from '../../hooks/useLoadingUI';

export function CreateEvent() {
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const {isStandalone, authRetrying, retryDiscordAuth} = useAuth();
  const form = useCreateEventForm();
  const showLoadingUI = useLoadingUI(form.loadingEdit);
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
    setGlobalError,
    saving,
    eventId,
    setEventId,
    showPublishModal,
    setShowPublishModal,
    isPublished,
    values,
    normalizedTrackCodes,
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
    validatePublish,
    navigate,
    setTitle,
    setType,
    setStartsAtLocal,
    setDescription,
    setTrackCodes,
    setCarRuleMode,
    setMaxPi,
    setAdditionalCarRestrictions,
    setEventCars,
    setLobbyLeaderIsHost,
    setLobbyLeaderGamertag,
    onGuildChange,
    setTargetChannelId,
  } = form;

  const lobbyLeaderLabel = values.lobbyLeaderIsHost
    ? (user.xboxGamertag?.trim() || 'You (host)')
    : values.lobbyLeaderGamertag.trim() || '—';

  const missingForPublish = collectPublishGaps({
    channelId: values.targetChannelId,
    carRuleMode: values.carRuleMode,
    carCount: values.eventCars.length,
  });

  const hasDraftId = Boolean(eventId);
  const draftFlow = !isPublished;

  async function handleSaveDraft() {
    const id = await persistDraft();
    if (id) navigate('/my-events');
  }

  async function handleSaveChanges() {
    const id = await persistDraft();
    if (!id) return;
    navigate(isPublished ? `/event/${id}` : '/my-events');
  }

  async function handlePublishClick() {
    const publishErr = validatePublish();
    if (publishErr) {
      setGlobalError(publishErr);
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    if (!values.targetChannelId) {
      setShowPublishModal(true);
      return;
    }
    setPublishConfirmOpen(true);
  }

  async function executePublish() {
    const id = await persistDraft();
    if (!id || !token) return;
    setEventId(id);
    await confirmPublish(id);
  }

  function onPublishModalConfirm() {
    void (async () => {
      const publishErr = validatePublish();
      if (publishErr) {
        setGlobalError(publishErr);
        setShowPublishModal(false);
        window.scrollTo({top: 0, behavior: 'smooth'});
        return;
      }
      const id = await persistDraft();
      if (!id) return;
      if (!values.targetChannelId) return;
      await confirmPublish(id);
    })();
  }

  if (showLoadingUI) {
    return <PageLoading label="Loading event" className="pb-10 pt-5" />;
  }

  if (form.loadingEdit) {
    return null;
  }

  if (isConfigured && !isStandalone && !isSignedIn) {
    return (
      <SignInRequiredState
        description="Connect your Discord account to create, save, and publish events."
        busy={authRetrying}
        onRetry={() => void retryDiscordAuth()}
        className="pb-10 pt-5"
      />
    );
  }

  return (
    <ContentReveal className="pb-10 pt-5">
      <StepIndicator
        step={step}
        freeNavigation={hasDraftId}
        onStepClick={setStep}
      />

      <FormAlerts
        isConfigured={isConfigured}
        isSignedIn={isSignedIn}
        globalError={globalError}
      />

      {step === 0 && (
        <BasicsStep
          values={values}
          hostGamertag={user.xboxGamertag}
          fieldErrors={fieldErrors}
          onTitle={setTitle}
          onType={setType}
          onStartsAtLocal={setStartsAtLocal}
          onDescription={setDescription}
          onCoverChange={onCoverChange}
          lobbyLeaderIsHost={values.lobbyLeaderIsHost}
          onLobbyLeaderIsHost={setLobbyLeaderIsHost}
          onLobbyLeaderGamertag={setLobbyLeaderGamertag}
        />
      )}

      {step === 1 && (
        <DetailsStep
          trackCodes={values.trackCodes}
          onTrackCodes={setTrackCodes}
          carRuleMode={values.carRuleMode}
          onCarRuleMode={setCarRuleMode}
          maxPi={values.maxPi}
          onMaxPi={setMaxPi}
          additionalCarRestrictions={values.additionalCarRestrictions}
          onAdditionalCarRestrictions={setAdditionalCarRestrictions}
          eventCars={values.eventCars}
          onEventCars={setEventCars}
          fieldErrors={fieldErrors}
        />
      )}

      {step === 2 && (
        <TargetStep
          token={token}
          accessToken={token ?? ''}
          guildId={values.targetGuildId}
          guildName={values.targetGuildName}
          channelId={values.targetChannelId}
          lockGuild={isPublished}
          lockChannel={isPublished}
          fieldErrors={fieldErrors}
          onGuildChange={onGuildChange}
          onChannelChange={setTargetChannelId}
        />
      )}

      {step === 3 && (
        <ReviewStep
          title={values.title}
          type={values.type}
          startsAtLocal={values.startsAtLocal}
          coverPreview={values.coverPreview}
          targetGuildName={values.targetGuildName}
          targetChannelId={values.targetChannelId}
          normalizedTrackCodes={normalizedTrackCodes}
          carRuleMode={values.carRuleMode}
          maxPi={values.maxPi}
          carCount={values.eventCars.length}
          lobbyLeaderLabel={lobbyLeaderLabel}
          missingForPublish={missingForPublish}
        />
      )}

      <div className="mt-8 flex flex-col gap-2">
        {step < 3 && (
          <Button variant="primary" fullWidth onClick={() => tryContinue()}>
            Continue
          </Button>
        )}
        {step > 0 && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setStep((step - 1) as CreateEventStepIndex)}
          >
            Back
          </Button>
        )}

        {step === 3 && draftFlow && (
          <>
            <Button
              variant="primary"
              fullWidth
              disabled={saving || !canPersist}
              onClick={() => void handlePublishClick()}
            >
              {saving ? BUSY_LABEL.working : 'Publish event'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={saving || !canPersist}
              onClick={() =>
                void (hasDraftId ? handleSaveChanges() : handleSaveDraft())
              }
            >
              {saving ? BUSY_LABEL.saving : hasDraftId ? 'Save changes' : 'Save as draft'}
            </Button>
            {hasDraftId && (
              <Button
                variant="danger"
                fullWidth
                disabled={saving || !canPersist}
                onClick={requestDeleteDraft}
              >
                Delete draft
              </Button>
            )}
          </>
        )}

        {step === 3 && isPublished && (
          <>
            <Button
              variant="primary"
              fullWidth
              disabled={saving || !canPersist}
              onClick={() => void handleSaveChanges()}
            >
              {saving ? BUSY_LABEL.saving : 'Save changes'}
            </Button>
            {canCancelPublished ? (
              <Button
                variant="danger"
                fullWidth
                disabled={saving || !canPersist}
                onClick={requestCancelPublished}
              >
                Cancel event
              </Button>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete draft?"
        description="Delete this draft permanently? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        busy={saving}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void confirmDeleteDraft()}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel event?"
        description="The Discord announcement will be updated and registration will close."
        confirmLabel="Cancel event"
        variant="danger"
        busy={saving}
        onCancel={() => setCancelConfirmOpen(false)}
        onConfirm={() => void confirmCancelPublished()}
      />

      <ConfirmDialog
        open={publishConfirmOpen}
        title="Publish event?"
        description="This posts an announcement in Discord. Server and channel cannot be changed afterward."
        confirmLabel="Publish"
        busy={saving}
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={() => {
          setPublishConfirmOpen(false);
          void executePublish();
        }}
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
