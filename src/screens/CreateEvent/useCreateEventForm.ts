import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import i18n from '../../i18n';
import type {CarRuleMode, EventType} from '../../lib/types';
import {useAuth} from '../../context/AuthContext';
import {useCreateEventDraftContext} from '../../context/CreateEventDraftContext';
import {useJoinedEvents} from '../../context/JoinedEventsContext';
import {
  cancelEvent,
  deleteDraftEvent,
  isApiConfigured,
  publishEvent,
  saveEvent,
  uploadCoverImage,
} from '../../lib/api';
import {compressCoverForUpload} from '../../lib/coverImage';
import {defaultCoverPath, isBundledDefaultCover} from '../../lib/eventCovers';
import {fetchEventById} from '../../lib/events';
import {
  defaultTimezone,
  localInputToUtc,
  normalizeDatetimeLocalInput,
  utcToLocalInput,
} from '../../lib/datetime';
import {isLocalDevHost} from '../../lib/runtime';
import {isEventType} from '../../lib/eventTypes';
import {clampPi} from '../../lib/pi';
import {EVENT_PLAYER_SLOTS} from '../../lib/constants';
import {
  canCancelPublishedEvent,
  canEditEvent,
  isPublishedToDiscord,
} from '../../lib/eventSpec';
import {normalizeTracks, tracksToRows} from '../../lib/eventTracks';
import type {EventTrack} from '../../lib/types';
import type {EventCarEntry} from '../../components/EventCarList';
import type {ConvoyLeaderSelection} from '../../components/ConvoyLeaderPicker';
import {PUBLISH_STEP_INDEX, type CreateEventStepIndex} from './constants';
import type {CreateEventFormValues, CreateEventType, FieldErrors} from './types';
import {
  clearCreateEventWip,
  hasMeaningfulCreateProgress,
  readCreateEventWip,
  snapshotFromForm,
  snapshotsEqual,
  writeCreateEventWip,
  type CreateEventFormSnapshot,
  type DraftSyncStatus,
} from '../../lib/createEventPersistence';
import {
  validateCoverFile,
  validateDraftFormOutcome,
  validatePublishFormOutcome,
  validateBasicsStep,
  validateStep,
  firstFieldErrorStep,
  scrollToFirstFieldError,
  scrollToFirstFieldErrorAfterPaint,
} from './validation';

const AUTO_SAVE_DEBOUNCE_MS = 2500;
const WIP_SAVE_DEBOUNCE_MS = 400;

export function useCreateEventForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const {bumpRefresh} = useJoinedEvents();
  const {parkedSession, parkSession, clearParkedSession} = useCreateEventDraftContext();
  const {
    user,
    guildId: contextGuildId,
    guildName: contextGuildName,
    getAccessToken,
    isSignedIn,
    isConfigured,
  } = useAuth();

  const [step, setStep] = useState<CreateEventStepIndex>(editId ? PUBLISH_STEP_INDEX : 0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [eventId, setEventId] = useState<string | null>(editId);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [canCancelPublished, setCanCancelPublished] = useState(false);
  const [draftSyncStatus, setDraftSyncStatus] = useState<DraftSyncStatus>('idle');
  const [wipRestoreOffer, setWipRestoreOffer] = useState<CreateEventFormSnapshot | null>(null);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  const loadedEditRef = useRef<string | null>(editId);
  const lastSavedSnapshotRef = useRef<CreateEventFormSnapshot | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const isPublishedRef = useRef(false);
  const restoredOnMountRef = useRef(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<CreateEventType>('');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<EventTrack[]>([]);
  const [carRuleMode, setCarRuleMode] = useState<CarRuleMode>('anything_goes');
  const [maxPi, setMaxPi] = useState(800);
  const [additionalCarRestrictions, setAdditionalCarRestrictions] = useState('');
  const [eventCars, setEventCars] = useState<EventCarEntry[]>([]);
  const [lobbyLeaderIsHost, setLobbyLeaderIsHost] = useState(true);
  const [lobbyLeaderGamertag, setLobbyLeaderGamertag] = useState(user.xboxGamertag ?? '');
  const [lobbyLeaderDiscordId, setLobbyLeaderDiscordId] = useState<string | null>(null);
  const [lobbyLeaderUsername, setLobbyLeaderUsername] = useState('');
  /** Gamertag from profile/DB when the member was picked — not the live input value. */
  const [lobbyLeaderProfileGamertag, setLobbyLeaderProfileGamertag] = useState<string | null>(
    null,
  );
  const [targetGuildId, setTargetGuildId] = useState(contextGuildId ?? '');
  const [targetGuildName, setTargetGuildName] = useState(contextGuildName ?? '');
  const [targetChannelId, setTargetChannelId] = useState('');

  const token = getAccessToken();
  const canPersist = isApiConfigured() && token && isSignedIn;
  const normalizedTracks = useMemo(() => normalizeTracks(tracks), [tracks]);

  isPublishedRef.current = isPublished;

  const formSnapshot = useMemo(
    () =>
      snapshotFromForm({
        step,
        eventId,
        title,
        type,
        startsAtLocal,
        description,
        coverFile,
        coverPreview,
        coverUrl,
        tracks,
        carRuleMode,
        maxPi,
        additionalCarRestrictions,
        eventCars,
        lobbyLeaderIsHost,
        lobbyLeaderGamertag,
        lobbyLeaderDiscordId,
        lobbyLeaderUsername,
        lobbyLeaderProfileGamertag,
        targetGuildId,
        targetGuildName,
        targetChannelId,
      }),
    [
      step,
      eventId,
      title,
      type,
      startsAtLocal,
      description,
      coverFile,
      coverPreview,
      coverUrl,
      tracks,
      carRuleMode,
      maxPi,
      additionalCarRestrictions,
      eventCars,
      lobbyLeaderIsHost,
      lobbyLeaderGamertag,
      lobbyLeaderDiscordId,
      lobbyLeaderUsername,
      lobbyLeaderProfileGamertag,
      targetGuildId,
      targetGuildName,
      targetChannelId,
    ],
  );

  const applySnapshot = useCallback((snapshot: CreateEventFormSnapshot) => {
    setStep(snapshot.step);
    setEventId(snapshot.eventId);
    setTitle(snapshot.title);
    setType(snapshot.type);
    setStartsAtLocal(snapshot.startsAtLocal);
    setDescription(snapshot.description);
    setCoverFile(null);
    setCoverUrl(snapshot.coverUrl);
    setCoverPreview(snapshot.coverPreview);
    setTracks(snapshot.tracks);
    setCarRuleMode(snapshot.carRuleMode);
    setMaxPi(snapshot.maxPi);
    setAdditionalCarRestrictions(snapshot.additionalCarRestrictions);
    setEventCars(snapshot.eventCars);
    setLobbyLeaderIsHost(snapshot.lobbyLeaderIsHost);
    setLobbyLeaderGamertag(snapshot.lobbyLeaderGamertag);
    setLobbyLeaderDiscordId(snapshot.lobbyLeaderDiscordId);
    setLobbyLeaderUsername(snapshot.lobbyLeaderUsername);
    setLobbyLeaderProfileGamertag(snapshot.lobbyLeaderProfileGamertag);
    setTargetGuildId(snapshot.targetGuildId);
    setTargetGuildName(snapshot.targetGuildName);
    setTargetChannelId(snapshot.targetChannelId);
    lastSavedSnapshotRef.current = null;
    setDraftSyncStatus('dirty');
  }, []);

  const lobbyLeaderSelection = useMemo((): ConvoyLeaderSelection | null => {
    if (!lobbyLeaderDiscordId) return null;
    return {
      discordId: lobbyLeaderDiscordId,
      username: lobbyLeaderUsername,
      xboxGamertag: lobbyLeaderProfileGamertag,
    };
  }, [lobbyLeaderDiscordId, lobbyLeaderUsername, lobbyLeaderProfileGamertag]);

  const values: CreateEventFormValues = useMemo(
    () => ({
      title,
      type,
      startsAtLocal,
      description,
      coverFile,
      coverPreview,
      coverUrl,
      tracks,
      carRuleMode,
      maxPi,
      additionalCarRestrictions,
      eventCars,
      lobbyLeaderIsHost,
      lobbyLeaderGamertag,
      lobbyLeaderDiscordId,
      lobbyLeaderUsername,
      targetGuildId,
      targetGuildName,
      targetChannelId,
    }),
    [
      title,
      type,
      startsAtLocal,
      description,
      coverFile,
      coverPreview,
      coverUrl,
      tracks,
      carRuleMode,
      maxPi,
      additionalCarRestrictions,
      eventCars,
      lobbyLeaderIsHost,
      lobbyLeaderGamertag,
      lobbyLeaderDiscordId,
      lobbyLeaderUsername,
      targetGuildId,
      targetGuildName,
      targetChannelId,
    ],
  );

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = {...prev};
      delete next[key];
      return next;
    });
  }, []);

  const clearLobbyLeaderSelection = useCallback(() => {
    setLobbyLeaderDiscordId(null);
    setLobbyLeaderUsername('');
    setLobbyLeaderProfileGamertag(null);
    setLobbyLeaderGamertag('');
    clearFieldError('lobbyLeaderDiscordId');
    clearFieldError('lobbyLeaderGamertag');
  }, [clearFieldError]);

  const validationOptions = useMemo(
    () => ({allowPastStart: Boolean(editId)}),
    [editId],
  );

  const applyValidationFailure = useCallback(
    (fieldErrors: FieldErrors, globalError?: string | null) => {
      const errorKeys = Object.keys(fieldErrors);
      if (errorKeys.length > 0) {
        const focusStep = firstFieldErrorStep(fieldErrors);
        const stepChanged = !isPublished && focusStep !== step;
        if (stepChanged) {
          setStep(focusStep);
        }
        setFieldErrors(fieldErrors);
        setGlobalError(null);
        if (stepChanged) {
          scrollToFirstFieldErrorAfterPaint(fieldErrors);
        } else {
          requestAnimationFrame(() => scrollToFirstFieldError(fieldErrors));
        }
        return;
      }
      setFieldErrors({});
      setGlobalError(globalError ?? null);
      if (globalError) window.scrollTo({top: 0, behavior: 'smooth'});
    },
    [isPublished, step],
  );

  useEffect(() => {
    if (editId || loadingEdit || restoredOnMountRef.current || isPublished) return;
    if (parkedSession && hasMeaningfulCreateProgress(parkedSession)) {
      applySnapshot(parkedSession);
      clearParkedSession();
      restoredOnMountRef.current = true;
      setShowRestoredNotice(true);
      return;
    }
    const wip = readCreateEventWip();
    if (wip && hasMeaningfulCreateProgress(wip)) {
      setWipRestoreOffer(wip);
    }
    restoredOnMountRef.current = true;
  }, [
    applySnapshot,
    clearParkedSession,
    editId,
    isPublished,
    loadingEdit,
    parkedSession,
  ]);

  useEffect(() => {
    if (isPublished || loadingEdit) return;
    const timer = window.setTimeout(() => {
      writeCreateEventWip(formSnapshot);
    }, WIP_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [formSnapshot, isPublished, loadingEdit]);

  useEffect(() => {
    if (isPublished || loadingEdit) return;
    if (!hasMeaningfulCreateProgress(formSnapshot)) {
      setDraftSyncStatus('idle');
      return;
    }
    const lastSaved = lastSavedSnapshotRef.current;
    if (lastSaved && snapshotsEqual(formSnapshot, lastSaved)) {
      setDraftSyncStatus('saved');
      return;
    }
    setDraftSyncStatus((prev) => (prev === 'saving' ? prev : 'dirty'));
  }, [formSnapshot, isPublished, loadingEdit]);

  useEffect(() => {
    if (isPublished || !canPersist || loadingEdit || autoSaveInFlightRef.current) return;
    const outcome = validateDraftFormOutcome(
      values,
      user.xboxGamertag,
      validationOptions,
    );
    if (!outcome.ok) return;
    const lastSaved = lastSavedSnapshotRef.current;
    if (lastSaved && snapshotsEqual(formSnapshot, lastSaved)) return;

    const timer = window.setTimeout(() => {
      void persistDraft({silent: true, source: 'auto'});
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // persistDraft is stable enough for autosave scheduling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSnapshot, canPersist, isPublished, loadingEdit, values, user.xboxGamertag, validationOptions]);

  useEffect(() => {
    return () => {
      if (isPublishedRef.current) return;
      if (!hasMeaningfulCreateProgress(formSnapshot)) return;
      parkSession(formSnapshot);
      writeCreateEventWip(formSnapshot);
    };
  }, [formSnapshot, parkSession]);

  useEffect(() => {
    if (!editId) {
      setCanCancelPublished(false);
      setIsPublished(false);
      loadedEditRef.current = null;
      if (contextGuildId && !targetGuildId) {
        setTargetGuildId(contextGuildId);
        setTargetGuildName(contextGuildName ?? '');
      }
      return;
    }
    if (loadedEditRef.current === editId) return;
    loadedEditRef.current = editId;
    let cancelled = false;
    setLoadingEdit(true);
    void fetchEventById(editId, {discordToken: token})
      .then((ev) => {
        if (cancelled || !ev) return;
        if (ev.hostDiscordId !== user.discordId) {
          navigate(`/event/${editId}`, {replace: true});
          return;
        }
        if (!canEditEvent(ev, user)) {
          navigate(`/event/${editId}`, {replace: true});
          return;
        }
        setEventId(ev.id);
        const published = isPublishedToDiscord(ev);
        setIsPublished(published);
        setCanCancelPublished(canCancelPublishedEvent(ev, user));
        if (published) setStep(0);
        setTitle(ev.title);
        setType(ev.type);
        setStartsAtLocal(utcToLocalInput(ev.startsAt, defaultTimezone()));
        setDescription(ev.description ?? '');
        setTracks(ev.tracks ?? []);
        setCarRuleMode(ev.carRuleMode);
        setMaxPi(ev.maxPi);
        setAdditionalCarRestrictions(ev.additionalCarRestrictions ?? '');
        setEventCars(
          ev.allowedCars.map((c) => ({
            id: c.carId,
            make: c.make,
            model: c.model,
            year: c.year ?? null,
            pi: c.pi,
            maxPi: c.maxPi,
            tuneShareCode: c.tuneShareCode ?? '',
            restrictions: c.restrictions,
          })),
        );
        setTargetGuildId(ev.guildId ?? '');
        setTargetGuildName(ev.guildName ?? '');
        setTargetChannelId(ev.channelId ?? '');
        if (ev.lobbyLeaderIsHost === false && ev.lobbyLeaderDiscordId) {
          const leaderParticipant = ev.participants.find(
            (p) => p.discordId === ev.lobbyLeaderDiscordId,
          );
          setLobbyLeaderIsHost(false);
          setLobbyLeaderDiscordId(ev.lobbyLeaderDiscordId);
          setLobbyLeaderGamertag(ev.lobbyLeaderGamertag ?? '');
          setLobbyLeaderUsername(leaderParticipant?.username ?? '');
          setLobbyLeaderProfileGamertag(null);
        } else {
          const leader = ev.lobbyLeaderGamertag?.trim();
          if (leader && user.xboxGamertag && leader !== user.xboxGamertag) {
            setLobbyLeaderIsHost(false);
            setLobbyLeaderGamertag(leader);
            setLobbyLeaderDiscordId(null);
            setLobbyLeaderUsername('');
          } else {
            setLobbyLeaderIsHost(true);
            setLobbyLeaderGamertag(user.xboxGamertag ?? leader ?? '');
            setLobbyLeaderDiscordId(null);
            setLobbyLeaderUsername('');
          }
        }
        if (ev.coverImageUrl && !isBundledDefaultCover(ev.coverImageUrl)) {
          setCoverPreview(ev.coverImageUrl);
          setCoverUrl(ev.coverImageUrl);
        } else {
          setCoverPreview(defaultCoverPath(ev.type));
          setCoverUrl(null);
        }
        lastSavedSnapshotRef.current = snapshotFromForm({
          step: published ? 0 : PUBLISH_STEP_INDEX,
          eventId: ev.id,
          title: ev.title,
          type: ev.type,
          startsAtLocal: utcToLocalInput(ev.startsAt, defaultTimezone()),
          description: ev.description ?? '',
          coverFile: null,
          coverPreview:
            ev.coverImageUrl && !isBundledDefaultCover(ev.coverImageUrl)
              ? ev.coverImageUrl
              : defaultCoverPath(ev.type),
          coverUrl:
            ev.coverImageUrl && !isBundledDefaultCover(ev.coverImageUrl)
              ? ev.coverImageUrl
              : null,
          tracks: ev.tracks ?? [],
          carRuleMode: ev.carRuleMode,
          maxPi: ev.maxPi,
          additionalCarRestrictions: ev.additionalCarRestrictions ?? '',
          eventCars: ev.allowedCars.map((c) => ({
            id: c.carId,
            make: c.make,
            model: c.model,
            year: c.year ?? null,
            pi: c.pi,
            maxPi: c.maxPi,
            tuneShareCode: c.tuneShareCode ?? '',
            restrictions: c.restrictions,
          })),
          lobbyLeaderIsHost: ev.lobbyLeaderIsHost !== false,
          lobbyLeaderGamertag: ev.lobbyLeaderGamertag ?? '',
          lobbyLeaderDiscordId: ev.lobbyLeaderDiscordId ?? null,
          lobbyLeaderUsername: '',
          lobbyLeaderProfileGamertag: null,
          targetGuildId: ev.guildId ?? '',
          targetGuildName: ev.guildName ?? '',
          targetChannelId: ev.channelId ?? '',
        });
        setDraftSyncStatus('saved');
        clearParkedSession();
        clearCreateEventWip();
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    editId,
    token,
    user.discordId,
    user.xboxGamertag,
    navigate,
    contextGuildId,
    contextGuildName,
    clearParkedSession,
  ]);

  function buildPayload() {
    if (!isEventType(type)) {
      throw new Error(i18n.t('validation.typeRequired'));
    }
    const tz = defaultTimezone();
    return {
      id: eventId ?? undefined,
      guild_id: targetGuildId,
      guild_name: targetGuildName,
      channel_id: targetChannelId || null,
      title,
      type,
      starts_at: localInputToUtc(startsAtLocal, tz),
      timezone_hint: tz,
      max_players: EVENT_PLAYER_SLOTS,
      description,
      cover_image_url: coverFile ? undefined : coverUrl,
      tracks: tracksToRows(normalizedTracks),
      car_rule_mode: carRuleMode,
      max_pi: carRuleMode === 'anything_goes' ? maxPi : undefined,
      additional_car_restrictions:
        carRuleMode === 'anything_goes' ? additionalCarRestrictions.trim() || null : null,
      lobby_leader_gamertag: lobbyLeaderIsHost
        ? (user.xboxGamertag?.trim() || lobbyLeaderGamertag.trim())
        : lobbyLeaderGamertag.trim(),
      lobby_leader_is_host: lobbyLeaderIsHost,
      lobby_leader_discord_id: lobbyLeaderIsHost ? null : lobbyLeaderDiscordId,
      lobby_leader_username: lobbyLeaderIsHost
        ? null
        : lobbyLeaderUsername.trim() || null,
      voice_policy: 'optional' as const,
      cars:
        carRuleMode === 'restricted_list'
          ? eventCars.map((c) => ({
              id: c.id,
              make: c.make,
              model: c.model,
              year: c.year,
              pi: c.pi,
              max_pi: c.maxPi,
              tune_share_code: c.tuneShareCode.trim() || null,
              car_restrictions: c.restrictions,
            }))
          : [],
    };
  }

  async function confirmPublish(id: string): Promise<void> {
    if (!token || !targetGuildId || !targetChannelId) return;
    setSaving(true);
    setGlobalError(null);
    try {
      await publishEvent(token, id, targetGuildId, targetChannelId, targetGuildName);
      clearParkedSession();
      clearCreateEventWip();
      lastSavedSnapshotRef.current = null;
      bumpRefresh();
      setShowPublishModal(false);
      navigate(`/event/${id}`, {replace: true, state: {from: '/my-events'}});
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteDraft(): void {
    const id = eventId ?? editId;
    if (!id) {
      setGlobalError('Nothing to delete yet. Save as draft first.');
      return;
    }
    if (!token || !canPersist) {
      setGlobalError('Open this app in Discord to delete drafts.');
      return;
    }
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteDraft(): Promise<boolean> {
    const id = eventId ?? editId;
    if (!id || !token || !canPersist) return false;
    setSaving(true);
    setGlobalError(null);
    try {
      await deleteDraftEvent(token, id);
      setDeleteConfirmOpen(false);
      clearParkedSession();
      clearCreateEventWip();
      lastSavedSnapshotRef.current = null;
      bumpRefresh();
      navigate('/my-events', {replace: true});
      return true;
    } catch (e) {
      setGlobalError(String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function requestCancelPublished(): void {
    const id = eventId ?? editId;
    if (!id) return;
    if (!canCancelPublished) return;
    if (!token || !canPersist) {
      setGlobalError('Open this app in Discord to cancel events.');
      return;
    }
    setCancelConfirmOpen(true);
  }

  async function confirmCancelPublished(): Promise<boolean> {
    const id = eventId ?? editId;
    if (!id || !token || !canPersist || !canCancelPublished) return false;
    setSaving(true);
    setGlobalError(null);
    try {
      await cancelEvent(token, id);
      setCancelConfirmOpen(false);
      bumpRefresh();
      navigate(`/event/${id}`, {replace: true, state: {from: '/my-events'}});
      return true;
    } catch (e) {
      setGlobalError(String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function persistDraft(
    options?: {silent?: boolean; source?: 'manual' | 'auto'},
  ): Promise<string | null> {
    const silent = options?.silent ?? false;
    const source = options?.source ?? 'manual';
    const outcome = validateDraftFormOutcome(
      values,
      user.xboxGamertag,
      validationOptions,
    );
    if (!outcome.ok) {
      if (!silent) applyValidationFailure(outcome.fieldErrors, outcome.globalError);
      return null;
    }
    if (!canPersist || !token) {
      if (!silent) {
        setGlobalError('Connect Discord and configure Supabase to save events.');
      }
      return null;
    }
    if (source === 'auto') {
      autoSaveInFlightRef.current = true;
      setDraftSyncStatus('saving');
    } else {
      setSaving(true);
      setDraftSyncStatus('saving');
    }
    setGlobalError(null);
    try {
      const result = await saveEvent(token, buildPayload());
      const id = result.id;
      let savedCoverUrl = coverUrl;
      let savedCoverPreview =
        coverPreview && !coverPreview.startsWith('blob:') ? coverPreview : coverUrl;
      if (coverFile && targetGuildId) {
        const compressed = await compressCoverForUpload(coverFile);
        const url = await uploadCoverImage(token, targetGuildId, id, compressed);
        savedCoverUrl = url;
        savedCoverPreview = url;
        setCoverUrl(url);
        setCoverPreview(url);
        setCoverFile(null);
        await saveEvent(token, {...buildPayload(), id, cover_image_url: url});
      }
      setEventId(id);
      loadedEditRef.current = id;
      lastSavedSnapshotRef.current = {
        ...formSnapshot,
        eventId: id,
        pendingCover: false,
        coverUrl: savedCoverUrl,
        coverPreview: savedCoverPreview,
      };
      clearParkedSession();
      clearCreateEventWip();
      setDraftSyncStatus('saved');
      bumpRefresh();
      if (source === 'auto' && !editId) {
        navigate(`/create?edit=${id}`, {replace: true});
      }
      return id;
    } catch (e) {
      setDraftSyncStatus('error');
      if (!silent) setGlobalError(String(e));
      return null;
    } finally {
      if (source === 'auto') {
        autoSaveInFlightRef.current = false;
      } else {
        setSaving(false);
      }
    }
  }

  function restoreWipSnapshot() {
    if (!wipRestoreOffer) return;
    applySnapshot(wipRestoreOffer);
    setWipRestoreOffer(null);
    clearCreateEventWip();
    setShowRestoredNotice(true);
  }

  function discardWipSnapshot() {
    setWipRestoreOffer(null);
    clearCreateEventWip();
  }

  function dismissRestoredNotice() {
    setShowRestoredNotice(false);
  }

  function goToStep(next: CreateEventStepIndex) {
    setFieldErrors({});
    setGlobalError(null);
    setStep(next);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function tryContinue(): boolean {
    const errors =
      isLocalDevHost() && step === 0
        ? validateBasicsStep(values, {allowPastStart: true})
        : validateStep(step, values, {
            allowPastStart: Boolean(editId),
            hostGamertag: user.xboxGamertag,
          });
    if (Object.keys(errors).length > 0) {
      applyValidationFailure(errors);
      return false;
    }
    setFieldErrors({});
    if (step < PUBLISH_STEP_INDEX) goToStep((step + 1) as CreateEventStepIndex);
    return true;
  }

  function validateBeforePublish(): boolean {
    const outcome = validatePublishFormOutcome(
      values,
      user.xboxGamertag ?? values.lobbyLeaderGamertag,
      validationOptions,
    );
    if (outcome.ok) {
      setFieldErrors({});
      setGlobalError(null);
      return true;
    }
    applyValidationFailure(outcome.fieldErrors, outcome.globalError);
    return false;
  }

  function onCoverChange(file: File | null) {
    clearFieldError('cover');
    if (file) {
      const coverErr = validateCoverFile(file);
      if (coverErr) {
        setFieldErrors((prev) => ({...prev, cover: coverErr}));
        return;
      }
    }
    setCoverFile(file);
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : coverUrl);
  }

  return {
    editId,
    user,
    token,
    isConfigured,
    isSignedIn,
    canPersist,
    step,
    setStep: goToStep,
    fieldErrors,
    clearFieldError,
    globalError,
    setGlobalError,
    saving,
    loadingEdit,
    eventId,
    setEventId,
    showPublishModal,
    setShowPublishModal,
    isPublished,
    values,
    normalizedTracks,
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
    draftSyncStatus,
    wipRestoreOffer,
    restoreWipSnapshot,
    discardWipSnapshot,
    showRestoredNotice,
    dismissRestoredNotice,
    pendingCoverRestore: formSnapshot.pendingCover,
    // setters
    setTitle: (v: string) => {
      clearFieldError('title');
      setTitle(v);
    },
    setType: (nextType: EventType) => {
      clearFieldError('type');
      setType(nextType);
      if (coverFile) return;
      if (coverUrl !== null && !isBundledDefaultCover(coverUrl)) return;
      setCoverUrl(null);
      setCoverPreview(defaultCoverPath(nextType));
    },
    setStartsAtLocal: (v: string) => {
      clearFieldError('startsAtLocal');
      setStartsAtLocal(normalizeDatetimeLocalInput(v));
    },
    setDescription,
    setTracks,
    setCarRuleMode: (m: CarRuleMode) => {
      clearFieldError('eventCars');
      clearFieldError('maxPi');
      setCarRuleMode(m);
    },
    setMaxPi: (n: number) => {
      clearFieldError('maxPi');
      setMaxPi(clampPi(n));
    },
    setAdditionalCarRestrictions,
    setEventCars: (cars: EventCarEntry[]) => {
      clearFieldError('eventCars');
      setEventCars(cars);
    },
    lobbyLeaderSelection,
    setLobbyLeaderIsHost: (v: boolean) => {
      clearFieldError('lobbyLeaderGamertag');
      clearFieldError('lobbyLeaderDiscordId');
      setLobbyLeaderIsHost(v);
      if (v) {
        clearLobbyLeaderSelection();
        setLobbyLeaderGamertag(user.xboxGamertag ?? '');
      }
    },
    setLobbyLeaderGamertag: (v: string) => {
      clearFieldError('lobbyLeaderGamertag');
      setLobbyLeaderGamertag(v);
    },
    onLobbyLeaderSelect: (member: ConvoyLeaderSelection | null) => {
      if (!member) {
        clearLobbyLeaderSelection();
        return;
      }
      clearFieldError('lobbyLeaderDiscordId');
      clearFieldError('lobbyLeaderGamertag');
      setLobbyLeaderDiscordId(member.discordId);
      setLobbyLeaderUsername(member.username);
      setLobbyLeaderProfileGamertag(member.xboxGamertag);
      setLobbyLeaderGamertag(member.xboxGamertag?.trim() ?? '');
    },
    setTargetGuildId,
    setTargetGuildName,
    setTargetChannelId: (id: string) => {
      clearFieldError('targetChannelId');
      setTargetChannelId(id);
    },
    onGuildChange: (id: string, name: string) => {
      clearFieldError('targetGuildId');
      if (targetGuildId && id !== targetGuildId && !lobbyLeaderIsHost && lobbyLeaderDiscordId) {
        clearLobbyLeaderSelection();
      }
      setTargetGuildId(id);
      setTargetGuildName(name);
      if (!isPublished) setTargetChannelId('');
    },
  };
}
