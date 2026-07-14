import {useLayoutEffect} from 'react';
import type {PageMeta} from '../lib/pageMeta';

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

function applyPageMeta(meta: PageMeta) {
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

/** Updates document title + OG/Twitter meta for shareable public pages. */
export function usePageMeta(meta: PageMeta | null | undefined) {
  useLayoutEffect(() => {
    if (!meta) return;
    applyPageMeta(meta);
  }, [meta]);
}
