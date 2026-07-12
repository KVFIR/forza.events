import {describe, expect, it, vi, afterEach} from 'vitest';
import {
  clearCreateEventWip,
  hasMeaningfulCreateProgress,
  readCreateEventWip,
  snapshotFromForm,
  writeCreateEventWip,
  type CreateEventFormSnapshot,
} from '../src/lib/createEventPersistence';

const emptySnapshot = (): CreateEventFormSnapshot => ({
  step: 0,
  eventId: null,
  title: '',
  type: '',
  startsAtLocal: '',
  description: '',
  coverUrl: null,
  coverPreview: null,
  pendingCover: false,
  tracks: [],
  carRuleMode: 'anything_goes',
  maxPi: 800,
  additionalCarRestrictions: '',
  eventCars: [],
  lobbyLeaderIsHost: true,
  lobbyLeaderGamertag: '',
  lobbyLeaderDiscordId: null,
  lobbyLeaderUsername: '',
  lobbyLeaderProfileGamertag: null,
  targetGuildId: '',
  targetGuildName: '',
  targetChannelId: '',
});

describe('createEventPersistence', () => {
  afterEach(() => {
    clearCreateEventWip();
    vi.unstubAllGlobals();
  });

  it('detects meaningful progress', () => {
    expect(hasMeaningfulCreateProgress(emptySnapshot())).toBe(false);
    expect(hasMeaningfulCreateProgress({...emptySnapshot(), title: '  Night run '})).toBe(true);
  });

  it('serializes snapshots without blob cover preview', () => {
    const snapshot = snapshotFromForm({
      step: 1,
      eventId: null,
      title: 'Test',
      type: 'road',
      startsAtLocal: '2026-07-12T20:00',
      description: '',
      coverFile: null,
      coverPreview: 'blob:http://localhost/x',
      coverUrl: '/covers/road.jpg',
      tracks: [],
      carRuleMode: 'anything_goes',
      maxPi: 800,
      additionalCarRestrictions: '',
      eventCars: [],
      lobbyLeaderIsHost: true,
      lobbyLeaderGamertag: '',
      lobbyLeaderDiscordId: null,
      lobbyLeaderUsername: '',
      lobbyLeaderProfileGamertag: null,
      targetGuildId: 'g1',
      targetGuildName: 'Server',
      targetChannelId: '',
    });
    expect(snapshot.coverPreview).toBe('/covers/road.jpg');
    expect(snapshot.pendingCover).toBe(false);
  });

  it('round-trips wip through sessionStorage', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });

    const snapshot = {...emptySnapshot(), title: 'Parked draft'};
    writeCreateEventWip(snapshot);
    const loaded = readCreateEventWip();
    expect(loaded?.title).toBe('Parked draft');
    expect(loaded?.v).toBe(1);

    clearCreateEventWip();
    expect(readCreateEventWip()).toBeNull();
  });
});
