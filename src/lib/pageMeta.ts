export const SITE_NAME = 'FORZA.EVENTS';

export const DEFAULT_SITE_ORIGIN = 'https://forza.events';

export const DEFAULT_OG_IMAGE_PATH = '/og/site.webp';

/** Standard link-preview card size (1.91:1). */
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

export type PageMeta = {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
};

/** Canonical origin for absolute OG URLs in the browser. */
export function resolvePageOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const fromEnv = import.meta.env.VITE_APP_ORIGIN as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, '');
  return DEFAULT_SITE_ORIGIN;
}

export function resolveDefaultOgImage(siteOrigin: string): string {
  const base = siteOrigin.replace(/\/$/, '');
  return `${base}${DEFAULT_OG_IMAGE_PATH}`;
}
