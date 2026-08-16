import {useCallback, useEffect, useState} from 'react';
import {isApiConfigured, listGuilds} from '../lib/api';

type RecheckOptions = {fresh?: boolean};

async function fetchDmReachable(
  accessToken: string,
  options?: RecheckOptions,
): Promise<boolean> {
  const {guilds} = await listGuilds(accessToken, {dmReachability: true, ...options});
  return guilds.length > 0;
}

/** Whether the signed-in user shares a Discord server with the bot (required for DMs). */
export function useNotificationDmReachability(
  accessToken: string | null,
  eager = true,
) {
  const [reachable, setReachable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const recheck = useCallback(async (options?: RecheckOptions) => {
    if (!accessToken) {
      setReachable(false);
      setChecked(false);
      return false;
    }
    if (!isApiConfigured()) {
      setReachable(true);
      setChecked(true);
      return true;
    }
    setLoading(true);
    try {
      const next = await fetchDmReachable(accessToken, options);
      setReachable(next);
      setChecked(true);
      return next;
    } catch {
      if (!options?.fresh) {
        try {
          const next = await fetchDmReachable(accessToken, {fresh: true});
          setReachable(next);
          setChecked(true);
          return next;
        } catch {
          setChecked(false);
          return false;
        }
      }
      setChecked(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!eager) return;
    void recheck();
  }, [recheck, eager]);

  return {reachable, loading, checked, recheck};
}
