import {useLayoutEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {
  endDeferBrowseFeed,
  getEmbedLaunchEventIdFromLocation,
} from '../lib/activityLaunch';
import {isStandaloneBrowser} from '../lib/discord';

/**
 * Routes embed-button launches to `/event/:id` before browse effects run.
 * Uses `custom_id` from the iframe URL (same value as `sdk.customId` after ready).
 */
export function LaunchRedirector() {
  const navigate = useNavigate();
  const {pathname} = useLocation();
  const embedEventId = getEmbedLaunchEventIdFromLocation();

  useLayoutEffect(() => {
    if (isStandaloneBrowser() || !embedEventId) return;

    const targetPath = `/event/${embedEventId}`;
    if (pathname === targetPath) {
      endDeferBrowseFeed();
      return;
    }

    navigate(targetPath, {replace: true});
    endDeferBrowseFeed();
  }, [embedEventId, pathname, navigate]);

  return null;
}
