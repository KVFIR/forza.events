import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import i18n from '../../i18n';
import type {CarRuleMode, EventType} from '../../lib/types';
import {useAuth} from '../../context/AuthContext';
import {useJoinedEvents} from '../../context/JoinedEventsContext';
import {
  cancelEvent,
  deleteDraftEvent,
  isApiConfigured,
  listGuilds,
  publishEvent,
  saveEvent,
  uploadCoverImage,
} from '../../lib/api';
import {track} from '../../lib/analytics';
import {compressCoverForUpload} from '../../lib/coverImage';
import {defaultCoverPath, isBundledDefaultCover} from '../../lib/eventCovers';
import {fetchEventById} from '../../lib/events';
import {
  defaultTimezone,
  localInputToUtc,
  normalizeDatetimeLocalInput,
  utcToLocalInput,
} from '../../lib/datetime';
import {isLocalDevHost, supportsBrowserOAuth} from '../../lib/runtime';
import {isEventType} from '../../lib/eventTypes';
import {normalizeEventGame, type ForzaGame} from '../../lib/eventGames';
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
import {
  publishedNotifyFieldsChanged,
  type PublishedNotifyBaseline,
} from '../../lib/publishedEventNotifyDiff';
import {PUBLISH_STEP_INDEX, type CreateEventStepIndex} from './constants';
import type {CreateEventFormValues, CreateEventType, FieldErrors} from './types';
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

/** Legacy sessionStorage key from removed WIP autosave — cleared on mount. */
const LEGACY_CREATE_WIP_KEY = 'forza.create.wip';

export function useCreateEventForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const {bumpRefresh} = useJoinedEvents();
  const {
    user,
    getAccessToken,
    isSignedIn,
    isConfigured,
    loading: authLoading,
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
  const [notifyBaseline, setNotifyBaseline] = useState<PublishedNotifyBaseline | null>(null);

  const loadedEditRef = useRef<string | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<CreateEventType>('');
  const [game, setGame] = useState<ForzaGame>('fh6');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<EventTrack[]>([]);
  const [carRuleMode, setCarRuleMode] = useState<CarRuleMode>('anything_goes');
  const [maxPi, setMaxPi] = useState<number | null>(null);
  const [additionalCarRestrictions, setAdditionalCarRestrictions] = useState('');
  const [eventCars, setEventCars] = useState<EventCarEntry[]>([]);
  const [lobbyLeaderIsHost, setLobbyLeaderIsHost] = useState(true);
  const [lobbyLeaderGamertag, setLobbyLeaderGamertag] = useState(user.xboxGamertag ?? '');
  const [lobbyLeaderDiscordId, setLobbyLeaderDiscordId] = useState<string | null>(null);
  const [lobbyLeaderUsername, setLobbyLeaderUsername] = useState('');
  const [lobbyLeaderProfileGamertag, setLobbyLeaderProfileGamertag] = useState<string | null>(
    null,
  );
  const [targetGuildId, setTargetGuildId] = useState('');
  const [targetGuildName, setTargetGuildName] = useState('');
  const [targetChannelId, setTargetChannelId] = useState('');
  const [targetVoiceChannelId, setTargetVoiceChannelId] = useState('');
  const [isRanked, setIsRanked] = useState(false);
  const [targetGuildRatingEnabled, setTargetGuildRatingEnabled] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem(LEGACY_CREATE_WIP_KEY);
    } catch {
      // ponytail: private browsing may block storage
    }
  }, []);

  const token = getAccessToken();
  const canPersist = isApiConfigured() && token && isSignedIn;
  const normalizedTracks = useMemo(() => normalizeTracks(tracks), [tracks]);

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
      game,
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
      targetVoiceChannelId,
      isRanked,
      targetGuildRatingEnabled,
    }),
    [
      title,
      type,
      game,
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
      targetVoiceChannelId,
      isRanked,
      targetGuildRatingEnabled,
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
    if (!editId) {
      setCanCancelPublished(false);
      setIsPublished(false);
      loadedEditRef.current = null;
      return;
    }
    if (loadedEditRef.current === editId) {
      setLoadingEdit(false);
      return;
    }
    if (!token) {
      setLoadingEdit(authLoading || (Boolean(editId) && isSignedIn));
      return;
    }
    let cancelled = false;
    setLoadingEdit(true);
    void fetchEventById(editId, {discordToken: token})
      .then((ev) => {
        if (cancelled) return;
        if (!ev) {
          loadedEditRef.current = null;
          navigate('/my-events', {replace: true});
          return;
        }
        loadedEditRef.current = editId;
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
        if (published) {
          setNotifyBaseline({
            startsAt: ev.startsAt,
            tracks: ev.tracks ?? [],
            carRuleMode: ev.carRuleMode,
            maxPi: ev.maxPi,
            additionalCarRestrictions: ev.additionalCarRestrictions ?? '',
            cars: ev.allowedCars.map((c) => ({
              id: c.carId,
              maxPi: c.maxPi,
              tuneShareCode: c.tuneShareCode,
              restrictions: c.restrictions,
            })),
          });
        } else {
          setNotifyBaseline(null);
        }
        if (published) setStep(0);
        setTitle(ev.title);
        setType(ev.type);
        setGame(normalizeEventGame(ev.game));
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
        setTargetVoiceChannelId(ev.voiceChannelId ?? '');
        setIsRanked(Boolean(ev.isRanked));
        setTargetGuildRatingEnabled(false);
        const guildIdForRating = ev.guildId?.trim();
        if (guildIdForRating && token) {
          void listGuilds(token)
            .then((r) => {
              if (cancelled) return;
              const match = r.guilds.find((g) => g.id === guildIdForRating);
              setTargetGuildRatingEnabled(Boolean(match?.rating_enabled));
              if (!match?.rating_enabled && !ev.isRanked) setIsRanked(false);
            })
            .catch(() => {
              // ponytail: keep toggle hidden if guild list fails
            });
        }

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

        const coverPreviewValue =
          ev.coverImageUrl && !isBundledDefaultCover(ev.coverImageUrl)
            ? ev.coverImageUrl
            : defaultCoverPath(ev.type);
        const coverUrlValue =
          ev.coverImageUrl && !isBundledDefaultCover(ev.coverImageUrl)
            ? ev.coverImageUrl
            : null;

        setCoverPreview(coverPreviewValue);
        setCoverUrl(coverUrlValue);
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
    authLoading,
    isSignedIn,
    user.discordId,
    user.xboxGamertag,
    navigate,
  ]);

  function buildPayload() {
    if (!isEventType(type)) {
      throw new Error(i18n.t('validation.typeRequired'));
    }
    const tz = defaultTimezone();
    const leaderFields = isPublished
      ? {}
      : {
          lobby_leader_gamertag: lobbyLeaderIsHost
            ? (user.xboxGamertag?.trim() || lobbyLeaderGamertag.trim())
            : lobbyLeaderGamertag.trim(),
          lobby_leader_is_host: lobbyLeaderIsHost,
          lobby_leader_discord_id: lobbyLeaderIsHost ? null : lobbyLeaderDiscordId,
          lobby_leader_username: lobbyLeaderIsHost
            ? null
            : lobbyLeaderUsername.trim() || null,
        };
    return {
      id: eventId ?? undefined,
      guild_id: targetGuildId.trim() || undefined,
      guild_name: targetGuildId.trim() ? targetGuildName : undefined,
      channel_id: targetChannelId || null,
      voice_channel_id: targetVoiceChannelId || null,
      title,
      type,
      game,
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
      ...leaderFields,
      voice_policy: 'optional' as const,
      is_ranked: isRanked,
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
      track('publish', {outcome: 'success', event_id: id});
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
      setGlobalError(i18n.t('create.nothingToDeleteYet'));
      return;
    }
    if (!token || !canPersist) {
      setGlobalError(i18n.t('auth.signInDiscordDelete'));
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
      setGlobalError(i18n.t('auth.signInDiscordCancel'));
      return;
    }
    setCancelConfirmOpen(true);
  }

  async function confirmCancelPublished(): Promise<boolean> {
    const id = eventId ?? editId;
    if (!id || !canPersist || !token || !canCancelPublished) return false;
    if (!isApiConfigured()) {
      setGlobalError(i18n.t('browse.errorNotConfiguredDesc'));
      return false;
    }
    setSaving(true);
    setGlobalError(null);
    try {
      await cancelEvent(token, id);
      track('cancel_event', {outcome: 'success', event_id: id});
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

  async function persistDraft(): Promise<string | null> {
    const outcome = validateDraftFormOutcome(
      values,
      user.xboxGamertag,
      validationOptions,
    );
    if (!outcome.ok) {
      applyValidationFailure(outcome.fieldErrors, outcome.globalError);
      return null;
    }
    if (!canPersist || !token) {
      setGlobalError(
        supportsBrowserOAuth()
          ? i18n.t('auth.browserSignInHint')
          : i18n.t('auth.openInDiscordSave'),
      );
      return null;
    }
    setSaving(true);
    setGlobalError(null);
    try {
      const result = await saveEvent(token, buildPayload());
      const id = result.id;
      // Drafts may omit guild_id until publish — still upload cover (path uses draft/ or guild/).
      if (coverFile) {
        const compressed = await compressCoverForUpload(coverFile);
        const url = await uploadCoverImage(token, targetGuildId || undefined, id, compressed);
        setCoverUrl(url);
        setCoverPreview(url);
        setCoverFile(null);
        await saveEvent(token, {...buildPayload(), id, cover_image_url: url});
      }
      setEventId(id);
      loadedEditRef.current = id;
      bumpRefresh();
      track('draft_save', {outcome: 'success', event_id: id});
      return id;
    } catch (e) {
      setGlobalError(String(e));
      return null;
    } finally {
      setSaving(false);
    }
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

  function navigateToStep(target: CreateEventStepIndex) {
    if (target === step) return;
    if (target < step) {
      goToStep(target);
      return;
    }
    if (target > step) tryContinue();
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

  const onGuildChange = useCallback(
    (id: string, name: string, ratingEnabled = false) => {
      clearFieldError('targetGuildId');
      const guildChanged = id !== targetGuildId;
      if (guildChanged && !lobbyLeaderIsHost && lobbyLeaderDiscordId) {
        clearLobbyLeaderSelection();
      }
      setTargetGuildId(id);
      setTargetGuildName(name);
      setTargetGuildRatingEnabled(ratingEnabled);
      // Only clear ranked on real guild change / cruise — not on PublishTargetPicker
      // name sync of the same server (allowlist miss must not silently unrank).
      if (type === 'cruise' || (guildChanged && !ratingEnabled)) setIsRanked(false);
      if (guildChanged) {
        if (!isPublished) setTargetChannelId('');
        setTargetVoiceChannelId('');
      }
    },
    [
      clearFieldError,
      targetGuildId,
      lobbyLeaderIsHost,
      lobbyLeaderDiscordId,
      clearLobbyLeaderSelection,
      isPublished,
      type,
    ],
  );

  const onTargetChannelChange = useCallback(
    (id: string) => {
      clearFieldError('targetChannelId');
      setTargetChannelId(id);
    },
    [clearFieldError],
  );

  const onTargetVoiceChannelChange = useCallback((id: string) => {
    setTargetVoiceChannelId(id);
  }, []);

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
    notifyBaseline,
    wouldNotifyRacersOnSave:
      isPublished &&
      publishedNotifyFieldsChanged(
        {
          startsAt: localInputToUtc(startsAtLocal, defaultTimezone()),
          tracks,
          carRuleMode,
          maxPi,
          additionalCarRestrictions,
          cars: eventCars.map((c) => ({
            id: c.id,
            maxPi: c.maxPi,
            tuneShareCode: c.tuneShareCode,
            restrictions: c.restrictions,
          })),
        },
        notifyBaseline,
      ),
    values,
    normalizedTracks,
    tryContinue,
    navigateToStep,
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
    setTitle: (v: string) => {
      clearFieldError('title');
      setTitle(v);
    },
    setType: (nextType: EventType) => {
      clearFieldError('type');
      setType(nextType);
      if (nextType === 'cruise') setIsRanked(false);
      if (coverFile) return;
      if (coverUrl !== null && !isBundledDefaultCover(coverUrl)) return;
      setCoverUrl(null);
      setCoverPreview(defaultCoverPath(nextType));
    },
    setGame: (nextGame: ForzaGame) => {
      if (isPublished || nextGame === game) return;
      setGame(nextGame);
      setEventCars([]);
      clearFieldError('eventCars');
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
    setMaxPi: (n: number | null) => {
      clearFieldError('maxPi');
      setMaxPi(n === null ? null : clampPi(n));
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
    setTargetChannelId: onTargetChannelChange,
    setTargetVoiceChannelId: onTargetVoiceChannelChange,
    onGuildChange,
    setIsRanked,
  };
}
