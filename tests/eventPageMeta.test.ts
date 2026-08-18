import {describe, expect, it} from 'vitest';
import {buildEventPageMeta as buildClientMeta} from '../src/lib/eventPageMeta';
import {
  buildCrawlerPageHtml,
  buildEventCrawlerBody,
  buildEventJsonLd,
  buildEventPageMeta as buildSharedMeta,
  escapeHtml,
  eventCrawlerRobots,
  eventPublicUrl,
  isLinkPreviewCrawler,
  parseEventPagePath,
  resolveEventCoverAbsolute,
} from '../shared/eventPageMeta.mjs';

const baseEvent = {
  id: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
  title: 'Sunset Sprint',
  type: 'road' as const,
    game: 'fh6',
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

  it('client and shared match for multi-group capacity', () => {
    const opts = {
      siteOrigin: 'https://forza.events',
      pageUrl: `https://forza.events/event/${baseEvent.id}`,
    };
    const client = buildClientMeta({...baseEvent, groupCount: 2, currentPlayers: 18}, opts);
    const shared = buildSharedMeta(
      {...baseDbEvent, group_count: 2, current_players: 18},
      opts,
    );
    expect(shared).toEqual(client);
    expect(client.description).not.toContain('participants');
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

  it('percent-encodes unicode slugs when pageUrl is omitted', () => {
    const slug = 'летний-круиз-20260818';
    const opts = {siteOrigin: 'https://forza.events'};
    const encoded = `https://forza.events/event/${encodeURIComponent(slug)}`;
    expect(buildSharedMeta({...baseDbEvent, slug}, opts).url).toBe(encoded);
    expect(buildClientMeta({...baseEvent, slug}, opts).url).toBe(encoded);
    expect(eventPublicUrl('https://forza.events', {slug}, {results: true})).toBe(
      `${encoded}/results`,
    );
    expect(buildSharedMeta({...baseDbEvent, slug}, {...opts, isResults: true}).url).toBe(
      `${encoded}/results`,
    );
    expect(buildClientMeta({...baseEvent, slug}, {...opts, isResults: true}).url).toBe(
      `${encoded}/results`,
    );
  });
});

describe('eventPageMeta shared', () => {
  it('parses event detail and results paths', () => {
    expect(parseEventPagePath('/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c')).toEqual({
      eventId: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
      isResults: false,
      isUuid: true,
    });
    expect(parseEventPagePath('/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c/results')).toEqual({
      eventId: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
      isResults: true,
      isUuid: true,
    });
    expect(parseEventPagePath('/event/sunset-sprint-20260715')).toEqual({
      eventId: 'sunset-sprint-20260715',
      isResults: false,
      isUuid: false,
    });
    expect(
      parseEventPagePath(`/event/${encodeURIComponent('летний-круиз-20260818')}`),
    ).toEqual({
      eventId: 'летний-круиз-20260818',
      isResults: false,
      isUuid: false,
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

    expect(meta.title).toBe('Sunset Sprint');
    expect(meta.description).toContain('Road racing');
    expect(meta.description).not.toContain('participants');
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

  it('emits escaped OG HTML with crawler body', () => {
    const meta = buildSharedMeta(
      {...baseDbEvent, title: 'A & B <test>'},
      {siteOrigin: 'https://forza.events'},
    );
    const html = buildCrawlerPageHtml(meta, {bodyHtml: buildEventCrawlerBody(meta)});
    expect(html).toContain('A &amp; B &lt;test&gt;');
    expect(html).toContain('<h1>');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="robots" content="index, follow"');
    expect(html).toContain('Browse events');
    expect(html).toContain('/leaderboard');
    expect(escapeHtml('a "b"')).toBe('a &quot;b&quot;');
  });

  it('puts event about text in crawler body and JSON-LD', () => {
    const meta = buildSharedMeta(baseDbEvent, {siteOrigin: 'https://forza.events'});
    const about = 'Bring a B-class tune.';
    expect(buildEventCrawlerBody(meta, {about})).toContain(about);
    expect(
      buildEventJsonLd({...baseDbEvent, description: about}, meta, {
        siteOrigin: 'https://forza.events',
      }).description,
    ).toBe(about);
    expect(buildEventCrawlerBody(meta, {about: 'A <b>tune</b>'})).toContain(
      'A &lt;b&gt;tune&lt;/b&gt;',
    );
  });

  it('noindexes results, cancelled, and archived event pages', () => {
    expect(eventCrawlerRobots('open')).toBe('index, follow');
    expect(eventCrawlerRobots('completed')).toBe('index, follow');
    expect(eventCrawlerRobots('open', true)).toBe('noindex, follow');
    expect(eventCrawlerRobots('cancelled')).toBe('noindex, follow');
    expect(eventCrawlerRobots('archived')).toBe('noindex, follow');
  });
});
