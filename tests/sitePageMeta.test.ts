import {describe, expect, it} from 'vitest';
import {buildStaticPageMeta as buildClientMeta, isEventPagePath} from '../src/lib/sitePageMeta';
import {
  buildDefaultSitePageMeta as buildSharedDefaultMeta,
  buildStaticPageMeta as buildSharedMeta,
  normalizeSitePath,
} from '../shared/sitePageMeta.mjs';

const origin = 'https://forza.events';

describe('sitePageMeta parity', () => {
  it('client and shared buildStaticPageMeta match for browse', () => {
    const opts = {siteOrigin: origin, pageUrl: `${origin}/`};
    expect(buildSharedMeta('/', opts)).toEqual(buildClientMeta('/', opts));
  });

  it('client and shared buildStaticPageMeta match for legal pages', () => {
    for (const path of ['/terms', '/privacy']) {
      const opts = {siteOrigin: origin, pageUrl: `${origin}${path}`};
      expect(buildSharedMeta(path, opts)).toEqual(buildClientMeta(path, opts));
    }
  });

  it('client and shared buildStaticPageMeta match for ladder', () => {
    const opts = {siteOrigin: origin, pageUrl: `${origin}/leaderboard`};
    const meta = buildClientMeta('/leaderboard', opts);
    expect(buildSharedMeta('/leaderboard', opts)).toEqual(meta);
    expect(meta.title).toBe('Ladder · FORZA.EVENTS');
    expect(meta.description).toContain('ranked');
  });

  it('client and shared default meta match for unknown paths', () => {
    const opts = {siteOrigin: origin, pageUrl: `${origin}/auth/callback`};
    expect(buildSharedMeta('/auth/callback', opts)).toEqual(
      buildClientMeta('/auth/callback', opts),
    );
    expect(buildSharedDefaultMeta(opts)).toEqual(buildClientMeta('/missing', opts));
  });

  it('normalizes trailing slashes', () => {
    expect(normalizeSitePath('/terms/')).toBe('/terms');
    expect(normalizeSitePath('/')).toBe('/');
  });

  it('uses branded titles for static pages', () => {
    const meta = buildClientMeta('/create', {siteOrigin: origin});
    expect(meta.title).toBe('Create event · FORZA.EVENTS');
    expect(meta.image).toBe(`${origin}/og/site.webp`);
    expect(meta.description).toContain('Discord');
  });

  it('canonical home URL has a trailing slash', () => {
    expect(buildClientMeta('/', {siteOrigin: origin}).url).toBe(`${origin}/`);
    expect(buildSharedMeta('/', {siteOrigin: origin}).url).toBe(`${origin}/`);
  });

  it('canonical pageUrl omits query strings when built without search', () => {
    const meta = buildClientMeta('/create', {
      siteOrigin: origin,
      pageUrl: `${origin}/create`,
    });
    expect(meta.url).toBe(`${origin}/create`);
    expect(meta.url).not.toContain('?');
  });

  it('isEventPagePath matches detail and results only', () => {
    const id = '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c';
    expect(isEventPagePath(`/event/${id}`)).toBe(true);
    expect(isEventPagePath(`/event/${id}/results`)).toBe(true);
    expect(isEventPagePath(`/event/${id}/results/`)).toBe(true);
    expect(isEventPagePath('/event/sunset-sprint-20260715')).toBe(true);
    expect(isEventPagePath('/event/sunset-sprint-20260715/results')).toBe(true);
    expect(isEventPagePath('/create')).toBe(false);
  });
});

describe('cloudflare static OG helpers', () => {
  it('worker modules load', async () => {
    await expect(import('../cloudflare/worker.js')).resolves.toBeDefined();
    await expect(import('../cloudflare/eventOgHandler.js')).resolves.toBeDefined();
    await expect(import('../cloudflare/staticOgHandler.js')).resolves.toBeDefined();
    await expect(import('../cloudflare/sitemapHandler.js')).resolves.toBeDefined();
    await expect(import('../cloudflare/robotsHandler.js')).resolves.toBeDefined();
    await expect(import('../cloudflare/railwayProxy.js')).resolves.toBeDefined();
  });

  it('isStaticAssetPath matches embed assets but not app routes', async () => {
    const {isStaticAssetPath} = await import('../shared/sitePageMeta.mjs');
    expect(isStaticAssetPath('/og/site.webp')).toBe(true);
    expect(isStaticAssetPath('/covers/cover-road-2.webp')).toBe(true);
    expect(isStaticAssetPath('/cars/fh6/abarth_fiat_131_1980_399.webp')).toBe(true);
    expect(isStaticAssetPath('/assets/index-abc.js')).toBe(true);
    expect(isStaticAssetPath('/logo/logo.png')).toBe(true);
    expect(isStaticAssetPath('/terms')).toBe(false);
    expect(isStaticAssetPath('/event/94d86ab7-ce55-49f8-84e3-91f3b9a7b39c')).toBe(false);
  });

  it('resolveDefaultOgImage is exported for eventOgHandler', async () => {
    const {resolveDefaultOgImage} = await import('../shared/sitePageMeta.mjs');
    expect(resolveDefaultOgImage('https://forza.events')).toBe(
      'https://forza.events/og/site.webp',
    );
  });
});
