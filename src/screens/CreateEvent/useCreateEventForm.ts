import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import type {CarRuleMode, EventType} from '../../lib/types';
import {useAuth} from '../../context/AuthContext';
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
  validateCoverFile,
  validateDraftSave,
  validatePublish,
  validateBasicsStep,
  validateStep,
} from './validation';

export function useCreateEventForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const {bumpRefresh} = useJoinedEvents();
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

  useEffect(() => {
    if (!editId) {
      setCanCancelPublished(false);
      setIsPublished(false);
      if (contextGuildId && !targetGuildId) {
        setTargetGuildId(contextGuildId);
        setTargetGuildName(contextGuildName ?? '');
      }
      return;
    }
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
  ]);

  function buildPayload() {
    if (!isEventType(type)) {
      throw new Error('Event type is required');
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
      cover_image_url: coverUrl,
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
      bumpRefresh();
      setShowPublishModal(false);
      navigate(`/event/${id}`);
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
      navigate(`/event/${id}`, {replace: true});
      return true;
    } catch (e) {
      setGlobalError(String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function persistDraft(): Promise<string | null> {
    const err = validateDraftSave(values, user.xboxGamertag);
    if (err) {
      setGlobalError(err);
      return null;
    }
    if (!canPersist || !token) {
      setGlobalError('Connect Discord and configure Supabase to save events.');
      return null;
    }
    setSaving(true);
    setGlobalError(null);
    try {
      const result = await saveEvent(token, buildPayload());
      let id = result.id;
      if (coverFile && targetGuildId) {
        const compressed = await compressCoverForUpload(coverFile);
        const url = await uploadCoverImage(token, targetGuildId, id, compressed);
        setCoverUrl(url);
        await saveEvent(token, {...buildPayload(), id, cover_image_url: url});
      }
      setEventId(id);
      bumpRefresh();
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
      setFieldErrors(errors);
      setGlobalError(null);
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`create-${firstKey}`);
      el?.focus();
      return false;
    }
    setFieldErrors({});
    if (step < PUBLISH_STEP_INDEX) goToStep((step + 1) as CreateEventStepIndex);
    return true;
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
    validatePublish: () =>
      validatePublish(values, user.xboxGamertag ?? lobbyLeaderGamertag, {
        allowPastStart: Boolean(editId),
      }),
    buildPayload,
    navigate,
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
        setLobbyLeaderDiscordId(null);
        setLobbyLeaderUsername('');
        setLobbyLeaderProfileGamertag(null);
        setLobbyLeaderGamertag(user.xboxGamertag ?? '');
      }
    },
    setLobbyLeaderGamertag: (v: string) => {
      clearFieldError('lobbyLeaderGamertag');
      setLobbyLeaderGamertag(v);
    },
    onLobbyLeaderSelect: (member: ConvoyLeaderSelection | null) => {
      clearFieldError('lobbyLeaderDiscordId');
      clearFieldError('lobbyLeaderGamertag');
      if (!member) {
        setLobbyLeaderDiscordId(null);
        setLobbyLeaderUsername('');
        setLobbyLeaderProfileGamertag(null);
        setLobbyLeaderGamertag('');
        return;
      }
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
      setTargetGuildId(id);
      setTargetGuildName(name);
      if (!isPublished) setTargetChannelId('');
    },
  };
}
