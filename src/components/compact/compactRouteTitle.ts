import type {TFunction} from 'i18next';

/** Nav label for the current route in Discord PIP / grid (read-only header). */
export function compactRouteTitle(pathname: string, t: TFunction): string {
  if (pathname.startsWith('/event/')) return t('discordLayout.routeEvent');
  if (pathname.startsWith('/create')) return t('nav.create');
  if (pathname === '/my-events') return t('nav.myEvents');
  if (pathname === '/profile') return t('nav.profile');
  return t('nav.browse');
}
