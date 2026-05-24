import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {format} from 'date-fns';
import {Calendar, Users, Hash, Car} from 'lucide-react';
import type {EventType} from '../lib/types';
import {useAuth} from '../context/AuthContext';
import {isApiConfigured, publishEvent, saveEvent, uploadCoverImage} from '../lib/api';
import {fetchEventById} from '../lib/events';
import {defaultTimezone, localInputToUtc, utcToLocalInput} from '../lib/datetime';
import type {CarClassLetter} from '../lib/pi';
import {EVENT_PLAYER_SLOTS} from '../lib/constants';
import {defaultCoverPath} from '../lib/eventCovers';
import {piToClass} from '../lib/pi';
import {Button} from '../components/ui/Button';
import {EventCarList, type EventCarEntry} from '../components/EventCarList';
import {EventShareCodeList} from '../components/EventShareCodeList';
import {ChannelPicker} from '../components/ChannelPicker';
import {cn} from '../lib/cn';

const STEPS = ['Basics', 'Details', 'Review'] as const;

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
  const {user, guildId, guildName, getAccessToken, isMockMode} = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(editId);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('road');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [trackList, setTrackList] = useState<string[]>([]);
  const [eventCars, setEventCars] = useState<EventCarEntry[]>([]);
  const [lobbyLeaderIsHost, setLobbyLeaderIsHost] = useState(true);
  const [lobbyLeaderGamertag, setLobbyLeaderGamertag] = useState(user.xboxGamertag ?? '');

  const token = getAccessToken();
  const canPersist = isApiConfigured() && token && guildId && !isMockMode;

  useEffect(() => {
    if (!editId) return;
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
      setTitle(ev.title);
      setType(ev.type);
      setStartsAtLocal(utcToLocalInput(ev.startsAt, tz));
      setDescription(ev.description ?? '');
      setTrackList(ev.trackList ?? []);
      setEventCars(
        ev.allowedCars.map((c) => ({
          id: c.carId,
          make: c.make,
          model: c.model,
          year: c.year ?? null,
          pi: c.pi,
          class: c.class as CarClassLetter,
          maxPi: c.maxPi,
          tuneShareCode: c.tuneShareCode ?? '',
          restrictions: c.restrictions,
        })),
      );
      const leader = ev.lobbyLeaderGamertag?.trim();
      if (leader && user.xboxGamertag && leader !== user.xboxGamertag) {
        setLobbyLeaderIsHost(false);
        setLobbyLeaderGamertag(leader);
      } else {
        setLobbyLeaderIsHost(true);
        setLobbyLeaderGamertag(user.xboxGamertag ?? leader ?? '');
      }
      if (ev.coverImageUrl) setCoverPreview(ev.coverImageUrl);
    }).finally(() => {
      if (!cancelled) setLoadingEdit(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editId, user.discordId, user.xboxGamertag, navigate]);

  function validate() {
    if (eventCars.length === 0) return 'Add at least one car to the event.';
    return null;
  }

  function buildPayload(draft: boolean) {
    const tz = defaultTimezone();
    return {
      id: eventId ?? undefined,
      guild_id: guildId,
      guild_name: guildName,
      title,
      type,
      starts_at: localInputToUtc(startsAtLocal, tz),
      timezone_hint: tz,
      max_players: EVENT_PLAYER_SLOTS,
      description,
      track_list: trackList,
      lobby_leader_gamertag: lobbyLeaderIsHost
        ? (user.xboxGamertag ?? lobbyLeaderGamertag)
        : lobbyLeaderGamertag,
      lobby_leader_is_host: lobbyLeaderIsHost,
      voice_policy: 'optional' as const,
      cars: eventCars.map((c) => ({
        id: c.id,
        make: c.make,
        model: c.model,
        year: c.year,
        pi: c.pi,
        class: c.class,
        max_pi: c.maxPi,
        tune_share_code: c.tuneShareCode.trim() || null,
        car_restrictions: c.restrictions,
      })),
      publish: !draft,
    };
  }

  async function persistDraft(): Promise<string | null> {
    const err = validate();
    if (err) { setError(err); return null; }
    if (!canPersist || !token) {
      setError('Connect Discord and configure Supabase to save events.');
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveEvent(token, buildPayload(true));
      let id = result.id;
      if (coverFile && guildId) {
        const url = await uploadCoverImage(guildId, id, coverFile);
        await saveEvent(token, {...buildPayload(true), id, cover_image_url: url});
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
    const id = eventId ?? (await persistDraft());
    if (!id || !token) return;
    setEventId(id);
    setShowChannelPicker(true);
  }

  async function handleChannelSelect(channelId: string) {
    if (!token || !eventId) return;
    setSaving(true);
    try {
      await publishEvent(token, eventId, channelId);
      setShowChannelPicker(false);
      navigate(`/event/${eventId}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function onCoverChange(file: File | null) {
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  const lobbyLeader = lobbyLeaderIsHost ? user.xboxGamertag : lobbyLeaderGamertag;

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

      {/* Banners */}
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

      {/* ── Step 0: Basics ── */}
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

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <div className="space-y-6">
          <EventShareCodeList
            codes={trackList}
            onChange={setTrackList}
            inputClass={input}
            labelClass={label}
          />
          <Divider />
          <EventCarList
            cars={eventCars}
            onChange={setEventCars}
            inputClass={input}
            labelClass={label}
          />
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Cover */}
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
              {description && (
                <p className="mt-0.5 text-sm text-white/70 line-clamp-2">{description}</p>
              )}
            </div>
          </div>

          {/* Detail rows */}
          <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.08] overflow-hidden">
            {/* Type + date */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {startsAtLocal
                  ? format(new Date(startsAtLocal), 'EEE d MMM · HH:mm')
                  : <span className="text-muted">No date set</span>}
              </span>
            </div>

            {/* Lobby leader */}
            {lobbyLeader && (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Convoy leader</span>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {lobbyLeader}
                </span>
              </div>
            )}

            {/* Tracks */}
            {trackList.length > 0 && (
              <div className="px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                  Tracks
                </p>
                <ol className="space-y-0.5">
                  {trackList.map((code, i) => (
                    <li key={code} className="flex gap-2 text-xs text-slate-400">
                      <span className="tabular-nums text-muted/60">{i + 1}.</span>
                      <span className="font-mono">{code}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Cars */}
            {eventCars.length > 0 && (
              <div className="px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                  Cars
                </p>
                <ul className="space-y-1">
                  {eventCars.map((c) => {
                    const cls = piToClass(c.maxPi);
                    return (
                      <li
                        key={c.id}
                        className="grid grid-cols-[1fr_auto] gap-x-3 text-xs"
                      >
                        <span className="truncate text-slate-300">{c.model}</span>
                        <span className="shrink-0 tabular-nums text-muted">{cls} {c.maxPi}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Capacity */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Capacity</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Car className="h-3.5 w-3.5 shrink-0" />
                {eventCars.length} car{eventCars.length !== 1 ? 's' : ''}
                <span className="text-muted">·</span>
                <Hash className="h-3.5 w-3.5 shrink-0" />
                {trackList.length} track{trackList.length !== 1 ? 's' : ''}
                <span className="text-muted">·</span>
                <Users className="h-3.5 w-3.5 shrink-0" />
                {EVENT_PLAYER_SLOTS}+1
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex flex-col gap-2">
        {step < 2 && (
          <Button variant="primary" className="w-full" onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        )}
        {step > 0 && (
          <Button variant="secondary" className="w-full" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step === 2 && editId && (
          <Button
            variant="primary"
            className="w-full"
            disabled={saving || !canPersist}
            onClick={() => void handleSaveChanges()}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
        {step === 2 && !editId && (
          <>
            <Button variant="secondary" className="w-full" disabled={saving} onClick={handleSaveDraft}>
              Save as draft
            </Button>
            <Button
              variant="primary"
              className="w-full"
              disabled={saving || !canPersist}
              onClick={handlePublishClick}
            >
              {saving ? 'Saving…' : 'Publish to channel'}
            </Button>
          </>
        )}
      </div>

      {showChannelPicker && token && guildId && (
        <ChannelPicker
          guildId={guildId}
          accessToken={token}
          onSelect={handleChannelSelect}
          onCancel={() => setShowChannelPicker(false)}
        />
      )}
    </div>
  );
}
