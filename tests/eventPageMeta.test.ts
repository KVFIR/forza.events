import {describe, expect, it} from 'vitest';
import {buildEventPageMeta as buildClientMeta} from '../src/lib/eventPageMeta';
import {
  buildEventOgHtml,
  buildEventPageMeta as buildSharedMeta,
  escapeHtml,
  isLinkPreviewCrawler,
  parseEventPagePath,
  resolveEventCoverAbsolute,
} from '../shared/eventPageMeta.mjs';

const baseEvent = {
  id: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
  title: 'Sunset Sprint',
  type: 'road' as const,
  startsAt: '2026-07-15T18:00:00.000Z',
  currentPlayers: 4,
  maxPlayers: 12,
  coverImageUrl: null,
  lifecycle: 'open' as const,
};

const baseDbEvent = {
  id: baseEvent.id,
  title: baseEvent.title,
  type: baseEvent.type,
  starts_at: baseEvent.startsAt,
  current_players: baseEvent.currentPlayers,
  max_players: baseEvent.maxPlayers,
  cover_image_url: null,
  status: 'open',
};

function parity(dbStatus: string, lifecycle: typeof baseEvent.lifecycle) {
  const opts = {
    siteOrigin: 'https://forza.events',
    pageUrl: `https://forza.events/event/${baseEvent.id}`,
  };
  const client = buildClientMeta({...baseEvent, lifecycle}, opts);
  const shared = buildSharedMeta({...baseDbEvent, status: dbStatus}, opts);
  expect(shared).toEqual(client);
}

describe('eventPageMeta parity', () => {
  it('client and shared buildEventPageMeta match (open)', () => {
    parity('open', 'open');
  });

  it('client and shared match for completed', () => {
    parity('completed', 'completed');
  });

  it('client and shared match for cancelled', () => {
    parity('cancelled', 'cancelled');
  });

  it('client and shared match for results page title', () => {
    const opts = {
      siteOrigin: 'https://forza.events',
      pageUrl: `https://forza.events/event/${baseEvent.id}/results`,
      isResults: true,
    };
    expect(buildSharedMeta(baseDbEvent, opts)).toEqual(
      buildClientMeta(baseEvent, opts),
    );
    expect(buildClientMeta(baseEvent, opts).title).toContain('Results');
  });
});

describe('eventPageMeta shared', () => {
  it('parses event detail and results paths', () => {
    expect(parseEventPagePath('/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c')).toEqual({
      eventId: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
      isResults: false,
    });
    expect(parseEventPagePath('/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c/results')).toEqual({
      eventId: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
      isResults: true,
    });
    expect(parseEventPagePath('/events/foo')).toBeNull();
  });

  it('detects common link-preview crawlers', () => {
    expect(isLinkPreviewCrawler('Discordbot/2.0')).toBe(true);
    expect(isLinkPreviewCrawler('facebookexternalhit/1.1')).toBe(true);
    expect(isLinkPreviewCrawler('Slackbot-LinkExpanding 1.0')).toBe(true);
    expect(isLinkPreviewCrawler('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 Applebot/1.0')).toBe(true);
    expect(isLinkPreviewCrawler('Mozilla/5.0 Chrome/120')).toBe(false);
  });

  it('builds English OG meta with bundled cover fallback', () => {
    const meta = buildSharedMeta(baseDbEvent, {
      siteOrigin: 'https://forza.events',
      pageUrl: 'https://forza.events/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
    });

    expect(meta.title).toBe('Sunset Sprint · FORZA.EVENTS');
    expect(meta.description).toContain('Road racing');
    expect(meta.description).toContain('4/12 participants');
    expect(meta.image).toBe('https://forza.events/covers/cover-road-2.webp');
  });

  it('keeps absolute custom cover URLs', () => {
    const image = resolveEventCoverAbsolute(
      'dirt',
      'https://cdn.example.com/custom.webp',
      'https://forza.events',
    );
    expect(image).toBe('https://cdn.example.com/custom.webp');
  });

  it('emits escaped OG HTML', () => {
    const meta = buildSharedMeta(
      {...baseDbEvent, title: 'A & B <test>'},
      {siteOrigin: 'https://forza.events'},
    );
    const html = buildEventOgHtml(meta);
    expect(html).toContain('A &amp; B &lt;test&gt; · FORZA.EVENTS');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(escapeHtml('a "b"')).toBe('a &quot;b&quot;');
  });
});
