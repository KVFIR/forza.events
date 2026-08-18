import {describe, expect, it} from 'vitest';
import {
  buildEventCrawlerBody,
  buildEventJsonLd,
  buildCrawlerPageHtml,
  isLinkPreviewCrawler,
} from '../shared/eventPageMeta.mjs';
import {buildSiteJsonLd, buildStaticCrawlerExtras, buildHomeCrawlerBody} from '../shared/sitePageMeta.mjs';
import {buildRobotsTxt, buildSitemapXml, isPrivateCrawlerPath, SITEMAP_STATIC_PATHS} from '../shared/sitemap.mjs';

const origin = 'https://forza.events';

describe('sitemap', () => {
  it('buildRobotsTxt points to sitemap and blocks private routes', () => {
    const txt = buildRobotsTxt(origin);
    expect(txt).toContain('Sitemap: https://forza.events/sitemap.xml');
    expect(txt).toContain('Disallow: /sign-in');
    expect(txt).toContain('Disallow: /bot-installed');
    expect(txt).toContain('Allow: /event/');
  });

  it('isPrivateCrawlerPath matches robots disallow targets', () => {
    expect(isPrivateCrawlerPath('/sign-in')).toBe(true);
    expect(isPrivateCrawlerPath('/auth/callback')).toBe(true);
    expect(isPrivateCrawlerPath('/bot-installed')).toBe(true);
    expect(isPrivateCrawlerPath('/leaderboard')).toBe(false);
    expect(isPrivateCrawlerPath('/terms')).toBe(false);
    expect(isPrivateCrawlerPath('/')).toBe(false);
  });

  it('buildSitemapXml includes static pages and published events', () => {
    const xml = buildSitemapXml({
      siteOrigin: origin,
      staticPaths: SITEMAP_STATIC_PATHS,
      events: [
        {
          id: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c',
          slug: 'sunset-sprint-20260714',
          updated_at: '2026-07-14T10:00:00.000Z',
        },
      ],
    });

    expect(xml).toContain('<loc>https://forza.events/</loc>');
    expect(xml).toContain('<loc>https://forza.events/leaderboard</loc>');
    expect(xml).toContain('<loc>https://forza.events/terms</loc>');
    expect(xml).toContain('<loc>https://forza.events/privacy</loc>');
    expect(xml).toContain('<loc>https://forza.events/event/sunset-sprint-20260714</loc>');
    expect(xml).toContain('<lastmod>2026-07-14</lastmod>');
  });

  it('sitemap falls back to id when slug is missing', () => {
    const xml = buildSitemapXml({
      siteOrigin: origin,
      staticPaths: [],
      events: [{id: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c'}],
    });
    expect(xml).toContain(
      '<loc>https://forza.events/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c</loc>',
    );
  });

  it('percent-encodes unicode slugs in loc', () => {
    const xml = buildSitemapXml({
      siteOrigin: origin,
      staticPaths: [],
      events: [{id: '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c', slug: 'летний-круиз-20260818'}],
    });
    expect(xml).toContain(
      `<loc>https://forza.events/event/${encodeURIComponent('летний-круиз-20260818')}</loc>`,
    );
  });
});

describe('crawler HTML', () => {
  const meta = {
    title: 'Sunset Sprint',
    description: 'Road racing · Jul 15, 2026',
    image: `${origin}/covers/cover-road-2.webp`,
    url: `${origin}/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c`,
    siteName: 'FORZA.EVENTS',
  };

  it('includes readable body, robots meta, and JSON-LD', () => {
    const jsonLd = buildEventJsonLd(
      {id: meta.url, title: meta.title, type: 'road', starts_at: '2026-07-15T18:00:00.000Z', status: 'open'},
      meta,
      {siteOrigin: origin},
    );
    const html = buildCrawlerPageHtml(meta, {
      bodyHtml: buildEventCrawlerBody(meta),
      jsonLd,
    });

    expect(html).toContain('<h1>Sunset Sprint</h1>');
    expect(html).toContain('name="robots" content="index, follow"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Event"');
    expect(jsonLd.eventAttendanceMode).toContain('OnlineEventAttendanceMode');
    expect(jsonLd.location).toEqual({
      '@type': 'VirtualLocation',
      url: meta.url,
    });
  });

  it('omits eventStatus for completed events', () => {
    const jsonLd = buildEventJsonLd(
      {starts_at: '2026-07-15T18:00:00.000Z', status: 'completed'},
      meta,
      {siteOrigin: origin},
    );
    expect(jsonLd).not.toHaveProperty('eventStatus');
  });

  it('uses noindex robots on error pages', () => {
    const html = buildCrawlerPageHtml(meta, {robots: 'noindex, follow'});
    expect(html).toContain('name="robots" content="noindex, follow"');
  });

  it('adds WebSite JSON-LD on homepage only', () => {
    const homeMeta = {
      title: 'Browse events · FORZA.EVENTS',
      description: 'Browse upcoming Forza Horizon races.',
      image: `${origin}/og/site.webp`,
      url: `${origin}/`,
      siteName: 'FORZA.EVENTS',
    };
    const {jsonLd} = buildStaticCrawlerExtras('/', homeMeta, {siteOrigin: origin});
    expect(jsonLd).toEqual(buildSiteJsonLd({siteOrigin: origin, pageUrl: homeMeta.url}));

    const termsExtras = buildStaticCrawlerExtras('/terms', {
      ...homeMeta,
      title: 'Terms of Service · FORZA.EVENTS',
      url: `${origin}/terms`,
    });
    expect(termsExtras.jsonLd).toBeUndefined();
  });

  it('detects AI crawler user agents', () => {
    expect(isLinkPreviewCrawler('GPTBot/1.0')).toBe(true);
    expect(isLinkPreviewCrawler('PerplexityBot/1.0')).toBe(true);
    expect(isLinkPreviewCrawler('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
  });

  it('home crawler body lists event links and site nav', () => {
    const homeMeta = {
      title: 'Browse events · FORZA.EVENTS',
      description: 'Browse upcoming Forza Horizon races.',
      image: `${origin}/og/site.webp`,
      url: `${origin}/`,
      siteName: 'FORZA.EVENTS',
    };
    const html = buildHomeCrawlerBody(
      homeMeta,
      [{slug: 'sunset-sprint-20260714', title: 'Sunset Sprint'}],
      {siteOrigin: origin},
    );
    expect(html).toContain(`href="${origin}/event/sunset-sprint-20260714"`);
    expect(html).toContain('Sunset Sprint');
    expect(html).toContain(`href="${origin}/leaderboard"`);
    expect(html).toContain(`href="${origin}/terms"`);
  });
});
