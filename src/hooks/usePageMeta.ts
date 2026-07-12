import {useEffect} from 'react';
import type {EventPageMeta} from '../lib/eventPageMeta';

const DEFAULT_TITLE = 'FORZA.EVENTS';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function applyPageMeta(meta: EventPageMeta) {
  document.title = meta.title;
  upsertMeta('name', 'description', meta.description);
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:image', meta.image);
  upsertMeta('property', 'og:url', meta.url);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', meta.siteName);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);
  upsertMeta('name', 'twitter:image', meta.image);
}

function clearPageMeta() {
  document.title = DEFAULT_TITLE;
  for (const key of [
    'description',
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ]) {
    removeMeta('name', key);
  }
  for (const key of [
    'og:title',
    'og:description',
    'og:image',
    'og:url',
    'og:type',
    'og:site_name',
  ]) {
    removeMeta('property', key);
  }
}

/** Updates document title + OG/Twitter meta for shareable public pages. */
export function usePageMeta(meta: EventPageMeta | null | undefined) {
  useEffect(() => {
    if (!meta) {
      clearPageMeta();
      return;
    }
    applyPageMeta(meta);
    return () => clearPageMeta();
  }, [meta]);
}
