import {Button} from '../../components/ui/Button';
import {PublishTargetModal} from '../../components/PublishTargetPicker';
import {FormAlerts, StepIndicator} from './components/StepIndicator';
import type {CreateEventStepIndex} from './constants';
import {useCreateEventForm} from './useCreateEventForm';
import {BasicsStep} from './steps/BasicsStep';
import {DetailsStep} from './steps/DetailsStep';
import {TargetStep} from './steps/TargetStep';
import {ReviewStep, collectPublishGaps} from './steps/ReviewStep';
import {ContentReveal} from '../../components/ui/ContentReveal';
import {PageLoading} from '../../components/ui/PageLoading';
import {useLoadingUI} from '../../hooks/useLoadingUI';

export function CreateEvent() {
  const form = useCreateEventForm();
  const showLoadingUI = useLoadingUI(form.loadingEdit);
  const {
    editId,
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
    trackCount: normalizedTrackCodes.length,
    channelId: values.targetChannelId,
    carRuleMode: values.carRuleMode,
    carCount: values.eventCars.length,
  });

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
      return;
    }
    const id = eventId ?? (await persistDraft());
    if (!id || !token) return;
    setEventId(id);
    if (!values.targetChannelId) {
      setShowPublishModal(true);
      return;
    }
    await confirmPublish(id);
  }

  function onPublishModalConfirm() {
    if (eventId) void confirmPublish(eventId);
  }

  if (showLoadingUI) {
    return <PageLoading label="Loading event" className="pb-10 pt-5" />;
  }

  if (form.loadingEdit) {
    return null;
  }

  return (
    <ContentReveal className="pb-10 pt-5">
      <StepIndicator
        step={step}
        onStepClick={(i) => {
          if (i < step) setStep(i);
        }}
      />

      <FormAlerts
        isConfigured={isConfigured}
        isSignedIn={isSignedIn}
        globalError={globalError}
      />

      {step === 0 && (
        <BasicsStep
          values={values}
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
          <Button variant="primary" className="w-full" onClick={() => tryContinue()}>
            Continue
          </Button>
        )}
        {step > 0 && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setStep((step - 1) as CreateEventStepIndex)}
          >
            Back
          </Button>
        )}
        {step === 3 && editId && (
          <Button
            variant="primary"
            className="w-full"
            disabled={saving || !canPersist}
            onClick={() => void handleSaveChanges()}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
        {step === 3 && !editId && (
          <>
            <Button
              variant="secondary"
              className="w-full"
              disabled={saving}
              onClick={() => void handleSaveDraft()}
            >
              Save as draft
            </Button>
            <Button
              variant="primary"
              className="w-full"
              disabled={saving || !canPersist}
              onClick={() => void handlePublishClick()}
            >
              {saving ? 'Saving…' : 'Publish event'}
            </Button>
          </>
        )}
        {step === 3 && editId && !isPublished && (
          <Button
            variant="primary"
            className="w-full"
            disabled={saving || !canPersist}
            onClick={() => void handlePublishClick()}
          >
            {saving ? 'Publishing…' : 'Publish event'}
          </Button>
        )}
      </div>

      {showPublishModal && token && (
        <PublishTargetModal
          accessToken={token}
          guildId={values.targetGuildId}
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
