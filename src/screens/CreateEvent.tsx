import {useEffect, useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import type {CarRuleMode, EventType} from '../lib/types';
import {useAuth} from '../context/AuthContext';
import {isApiConfigured, publishEvent, saveEvent, uploadCoverImage} from '../lib/api';
import {fetchEventById} from '../lib/events';
import {defaultTimezone, localInputToUtc, utcToLocalInput} from '../lib/datetime';
import {clampPi, formatMaxPi} from '../lib/pi';
import {EVENT_PLAYER_SLOTS} from '../lib/constants';
import {defaultCoverPath} from '../lib/eventCovers';
import {normalizeTrackCodes, validateDraftForm, validatePublishForm, isPublishedEvent} from '../lib/eventSpec';
import {Button} from '../components/ui/Button';
import {EventCarList, type EventCarEntry} from '../components/EventCarList';
import {EventTrackCodeList} from '../components/EventTrackCodeList';
import {PublishTargetModal, PublishTargetPicker} from '../components/PublishTargetPicker';
import {cn} from '../lib/cn';

const STEPS = ['Basics', 'Details', 'Target', 'Review'] as const;

const EVENT_TYPES: {value: EventType; label: string}[] = [
  {value: 'road', label: 'Road'},
  {value: 'dirt', label: 'Dirt'},
  {value: 'drift', label: 'Drift'},
  {value: 'touge', label: 'Touge'},
];

const input =
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:border-white/20 focus:outline-none transition-colors duration-150';

const label = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5';

function Field({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={label}>{title}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/[0.05]" />;
}

export function CreateEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const {user, guildId: contextGuildId, guildName: contextGuildName, getAccessToken, isMockMode} =
    useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(editId);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('road');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [trackCodes, setTrackCodes] = useState<string[]>([]);
  const [carRuleMode, setCarRuleMode] = useState<CarRuleMode>('anything_goes');
  const [maxPi, setMaxPi] = useState(800);
  const [additionalCarRestrictions, setAdditionalCarRestrictions] = useState('');
  const [eventCars, setEventCars] = useState<EventCarEntry[]>([]);
  const [lobbyLeaderIsHost, setLobbyLeaderIsHost] = useState(true);
  const [lobbyLeaderGamertag, setLobbyLeaderGamertag] = useState(user.xboxGamertag ?? '');
  const [targetGuildId, setTargetGuildId] = useState(contextGuildId ?? '');
  const [targetGuildName, setTargetGuildName] = useState(contextGuildName ?? '');
  const [targetChannelId, setTargetChannelId] = useState('');

  const token = getAccessToken();
  const canPersist = isApiConfigured() && token && !isMockMode;
  const normalizedTrackCodes = useMemo(() => normalizeTrackCodes(trackCodes), [trackCodes]);

  useEffect(() => {
    if (!editId) {
      if (contextGuildId && !targetGuildId) {
        setTargetGuildId(contextGuildId);
        setTargetGuildName(contextGuildName ?? 'Server');
      }
      return;
    }
    let cancelled = false;
    setLoadingEdit(true);
    void fetchEventById(editId).then((ev) => {
      if (cancelled || !ev) return;
      if (ev.hostDiscordId !== user.discordId) {
        navigate(`/event/${editId}`, {replace: true});
        return;
      }
      const tz = ev.timezoneHint ?? defaultTimezone();
      setEventId(ev.id);
      setIsPublished(isPublishedEvent(ev));
      setTitle(ev.title);
      setType(ev.type);
      setStartsAtLocal(utcToLocalInput(ev.startsAt, tz));
      setDescription(ev.description ?? '');
      setTrackCodes(ev.trackCodes ?? []);
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
      const leader = ev.lobbyLeaderGamertag?.trim();
      if (leader && user.xboxGamertag && leader !== user.xboxGamertag) {
        setLobbyLeaderIsHost(false);
        setLobbyLeaderGamertag(leader);
      } else {
        setLobbyLeaderIsHost(true);
        setLobbyLeaderGamertag(user.xboxGamertag ?? leader ?? '');
      }
      if (ev.coverImageUrl) {
        setCoverPreview(ev.coverImageUrl);
        setCoverUrl(ev.coverImageUrl);
      }
    }).finally(() => {
      if (!cancelled) setLoadingEdit(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editId, user.discordId, user.xboxGamertag, navigate, contextGuildId, contextGuildName, targetGuildId]);

  function buildPayload() {
    const tz = defaultTimezone();
    return {
      id: eventId ?? undefined,
      guild_id: targetGuildId,
      guild_name: targetGuildName,
      title,
      type,
      starts_at: localInputToUtc(startsAtLocal, tz),
      timezone_hint: tz,
      max_players: EVENT_PLAYER_SLOTS,
      description,
      cover_image_url: coverUrl,
      track_codes: normalizedTrackCodes,
      car_rule_mode: carRuleMode,
      max_pi: carRuleMode === 'anything_goes' ? maxPi : undefined,
      additional_car_restrictions:
        carRuleMode === 'anything_goes' ? additionalCarRestrictions.trim() || null : null,
      lobby_leader_gamertag: lobbyLeaderIsHost
        ? (user.xboxGamertag ?? lobbyLeaderGamertag)
        : lobbyLeaderGamertag,
      lobby_leader_is_host: lobbyLeaderIsHost,
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

  async function persistDraft(): Promise<string | null> {
    const err = validateDraftForm({title, startsAtLocal, guildId: targetGuildId});
    if (err) {
      setError(err);
      return null;
    }
    if (!canPersist || !token) {
      setError('Connect Discord and configure Supabase to save events.');
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveEvent(token, buildPayload());
      let id = result.id;
      if (coverFile && targetGuildId) {
        const url = await uploadCoverImage(targetGuildId, id, coverFile);
        setCoverUrl(url);
        await saveEvent(token, {...buildPayload(), id, cover_image_url: url});
      }
      setEventId(id);
      return id;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const id = await persistDraft();
    if (id) navigate(editId ? `/event/${id}` : '/');
  }

  async function handleSaveChanges() {
    const id = await persistDraft();
    if (id) navigate(`/event/${id}`);
  }

  async function handlePublishClick() {
    const publishErr = validatePublishForm({
      title,
      startsAtLocal,
      guildId: targetGuildId,
      channelId: targetChannelId,
      coverReady: Boolean(coverFile || coverUrl || coverPreview),
      trackCodes: normalizedTrackCodes,
      carRuleMode,
      maxPi,
      carCount: eventCars.length,
      lobbyLeaderGamertag: lobbyLeaderIsHost ? (user.xboxGamertag ?? lobbyLeaderGamertag) : lobbyLeaderGamertag,
    });
    if (publishErr) {
      setError(publishErr);
      return;
    }
    const id = eventId ?? (await persistDraft());
    if (!id || !token) return;
    setEventId(id);
    if (!targetChannelId) {
      setShowPublishModal(true);
      return;
    }
    await confirmPublish(id);
  }

  async function confirmPublish(id: string) {
    if (!token || !targetGuildId || !targetChannelId) return;
    setSaving(true);
    setError(null);
    try {
      await publishEvent(token, id, targetGuildId, targetChannelId, targetGuildName);
      setShowPublishModal(false);
      navigate(`/event/${id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function onCoverChange(file: File | null) {
    setCoverFile(file);
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : coverUrl);
  }

  if (loadingEdit) {
    return <p className="py-20 text-center text-sm text-muted">Loading event…</p>;
  }

  return (
    <div className="pb-10 pt-5 animate-fade-in">
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums transition-colors duration-200',
                i < step
                  ? 'bg-white/10 text-white/50'
                  : i === step
                  ? 'bg-white text-black'
                  : 'bg-white/[0.05] text-muted',
              )}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={cn(
                'text-xs transition-colors duration-200',
                i === step ? 'font-semibold text-white' : 'text-muted',
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-6 transition-colors duration-200',
                  i < step ? 'bg-white/20' : 'bg-white/[0.06]',
                )}
              />
            )}
          </div>
        ))}
      </div>

      {isMockMode && (
        <p className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-muted">
          Mock mode — configure <code>VITE_SUPABASE_*</code> and run inside Discord to save.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
          {error}
        </p>
      )}

      {step === 0 && (
        <div className="space-y-5">
          <Field title="Event name">
            <input
              className={input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name your event"
            />
          </Field>

          <Field title="Type">
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors duration-150',
                    type === t.value
                      ? 'bg-white/[0.1] text-white'
                      : 'text-muted hover:text-slate-300',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field title="Date & time">
            <input
              type="datetime-local"
              className={cn(input, '[color-scheme:dark]')}
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
            />
          </Field>

          <Field title="Description">
            <textarea
              rows={3}
              className={cn(input, 'resize-none')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field title="Cover image">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/[0.1] px-4 py-3 text-sm text-muted transition-colors hover:border-white/20 hover:text-slate-300">
              <span>{coverFile ? coverFile.name : 'Choose file (max 2 MB)'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
              />
            </label>
            {coverPreview && (
              <img src={coverPreview} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" />
            )}
          </Field>

          <Divider />

          <Field title="Convoy leader">
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
              <span className="text-sm text-slate-300">I am the convoy leader</span>
              <input
                type="checkbox"
                checked={lobbyLeaderIsHost}
                onChange={(e) => setLobbyLeaderIsHost(e.target.checked)}
                className="h-4 w-4 accent-white"
              />
            </label>
            {!lobbyLeaderIsHost && (
              <input
                className={cn(input, 'mt-2')}
                placeholder="Gamertag"
                value={lobbyLeaderGamertag}
                onChange={(e) => setLobbyLeaderGamertag(e.target.value)}
              />
            )}
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <EventTrackCodeList
            codes={trackCodes}
            onChange={setTrackCodes}
            inputClass={input}
            labelClass={label}
          />

          <Divider />

          <Field title="Car rules">
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
              {(['anything_goes', 'restricted_list'] as CarRuleMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCarRuleMode(mode)}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors duration-150',
                    carRuleMode === mode
                      ? 'bg-white/[0.1] text-white'
                      : 'text-muted hover:text-slate-300',
                  )}
                >
                  {mode === 'anything_goes' ? 'Open build' : 'Restricted list'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Open build lets you set a PI cap and optional category notes instead of a fixed car list.
            </p>
          </Field>

          {carRuleMode === 'anything_goes' ? (
            <div className="space-y-3">
              <Field title="Max PI">
                <input
                  type="number"
                  min={100}
                  max={999}
                  className={input}
                  value={maxPi}
                  onChange={(e) => setMaxPi(clampPi(Number(e.target.value)))}
                />
                <p className="mt-1.5 text-xs text-muted">{formatMaxPi(maxPi)}</p>
              </Field>

              <Field title="Additional restrictions">
                <textarea
                  rows={3}
                  className={cn(input, 'resize-none')}
                  value={additionalCarRestrictions}
                  onChange={(e) => setAdditionalCarRestrictions(e.target.value)}
                  placeholder="Optional, e.g. Super Saloons or Modern Muscle"
                />
              </Field>
            </div>
          ) : (
            <EventCarList
              cars={eventCars}
              onChange={setEventCars}
              inputClass={input}
              labelClass={label}
            />
          )}
        </div>
      )}

      {step === 2 && !token && (
        <p className="text-sm text-muted">Sign in with Discord to choose a server and channel.</p>
      )}

      {step === 2 && token && (
        <PublishTargetPicker
          accessToken={token}
          guildId={targetGuildId}
          channelId={targetChannelId}
          lockGuild={isPublished}
          lockChannel={isPublished}
          onGuildChange={(id, name) => {
            setTargetGuildId(id);
            setTargetGuildName(name);
            if (!isPublished) setTargetChannelId('');
          }}
          onChannelChange={setTargetChannelId}
        />
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={coverPreview ?? defaultCoverPath(type)}
              alt=""
              className="aspect-video w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
              <h2 className="text-lg font-black text-white">
                {title || <span className="text-white/40">Untitled event</span>}
              </h2>
            </div>
          </div>

          <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
              <span className="uppercase tracking-widest text-muted">Server</span>
              <span>{targetGuildName || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
              <span className="uppercase tracking-widest text-muted">Channel</span>
              <span>{targetChannelId ? `#${targetChannelId.slice(-4)}` : 'Choose on publish'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
              <span className="uppercase tracking-widest text-muted">Tracks</span>
              <span className="font-mono">{normalizedTrackCodes[0] ? `${normalizedTrackCodes[0]}${normalizedTrackCodes.length > 1 ? ` +${normalizedTrackCodes.length - 1}` : ''}` : '—'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2">
        {step < 3 && (
          <Button variant="primary" className="w-full" onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        )}
        {step > 0 && (
          <Button variant="secondary" className="w-full" onClick={() => setStep(step - 1)}>
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
            <Button variant="secondary" className="w-full" disabled={saving} onClick={handleSaveDraft}>
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
          guildId={targetGuildId}
          channelId={targetChannelId}
          onGuildChange={(id, name) => {
            setTargetGuildId(id);
            setTargetGuildName(name);
            setTargetChannelId('');
          }}
          onChannelChange={setTargetChannelId}
          onCancel={() => setShowPublishModal(false)}
          confirming={saving}
          onConfirm={() => eventId && void confirmPublish(eventId)}
        />
      )}
    </div>
  );
}
