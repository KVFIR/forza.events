import {useEffect, useLayoutEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {
  endDeferBrowseFeed,
  getEmbedLaunchEventIdFromLocation,
  subscribeEmbedLaunchRoute,
} from '../lib/activityLaunch';
import {isStandaloneBrowser} from '../lib/discord';

function routeToEmbedEvent(
  eventId: string,
  pathname: string,
  navigate: (path: string, options: {replace: boolean}) => void,
): void {
  const targetPath = `/event/${eventId}`;
  if (pathname !== targetPath) {
    navigate(targetPath, {replace: true});
  }
  endDeferBrowseFeed();
}

/**
 * Keeps React Router in sync with embed deep links (URL `custom_id` or post-`sdk.ready()`).
 */
export function LaunchRedirector() {
  const navigate = useNavigate();
  const {pathname} = useLocation();

  useLayoutEffect(() => {
    if (isStandaloneBrowser()) return;

    const embedEventId = getEmbedLaunchEventIdFromLocation();
    if (!embedEventId) return;

    routeToEmbedEvent(embedEventId, pathname, navigate);
  }, [pathname, navigate]);

  useEffect(() => {
    if (isStandaloneBrowser()) return;

    return subscribeEmbedLaunchRoute((eventId) => {
      routeToEmbedEvent(eventId, window.location.pathname, navigate);
    });
  }, [navigate]);

  return null;
}
