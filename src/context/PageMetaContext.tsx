import {createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
import {usePageMeta} from '../hooks/usePageMeta';
import type {PageMeta} from '../lib/pageMeta';
import {resolvePageOrigin} from '../lib/pageMeta';
import {buildStaticPageMeta, buildDefaultSitePageMeta, isEventPagePath} from '../lib/sitePageMeta';

const PageMetaOverrideContext = createContext<((meta: PageMeta | null) => void) | null>(null);

export function PageMetaProvider({children}: {children: ReactNode}) {
  const location = useLocation();
  const [override, setOverride] = useState<PageMeta | null>(null);

  const canonicalPageUrl = useMemo(() => {
    const origin = resolvePageOrigin();
    return `${origin}${location.pathname}`;
  }, [location.pathname]);

  const staticMeta = useMemo(
    () =>
      buildStaticPageMeta(location.pathname, {
        siteOrigin: resolvePageOrigin(),
        pageUrl: canonicalPageUrl,
      }),
    [location.pathname, canonicalPageUrl],
  );

  const effectiveMeta = useMemo(() => {
    if (override) return override;
    if (isEventPagePath(location.pathname)) {
      return buildDefaultSitePageMeta({
        siteOrigin: resolvePageOrigin(),
        pageUrl: canonicalPageUrl,
      });
    }
    return staticMeta;
  }, [override, location.pathname, canonicalPageUrl, staticMeta]);

  usePageMeta(effectiveMeta);

  const setOverrideValue = useMemo(() => setOverride, []);

  return (
    <PageMetaOverrideContext.Provider value={setOverrideValue}>
      {children}
    </PageMetaOverrideContext.Provider>
  );
}

/** Lets event pages replace route-level OG meta while mounted. */
export function usePageMetaOverride(meta: PageMeta | null | undefined) {
  const setOverride = useContext(PageMetaOverrideContext);
  if (!setOverride) {
    throw new Error('usePageMetaOverride must be used within PageMetaProvider');
  }

  useLayoutEffect(() => {
    setOverride(meta ?? null);
    return () => setOverride(null);
  }, [meta, setOverride]);
}
