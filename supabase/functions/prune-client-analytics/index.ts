import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {cronSecretOk} from '../_shared/cronSecret.ts';
import {adminClient} from '../_shared/supabase.ts';

const DEFAULT_RETENTION_DAYS = 90;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }
  if (!cronSecretOk(req)) {
    return jsonResponse({error: 'Unauthorized'}, 401, req);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const daysRaw = Number(body?.days ?? DEFAULT_RETENTION_DAYS);
    const days = Number.isFinite(daysRaw)
      ? Math.min(Math.max(Math.trunc(daysRaw), 1), 365)
      : DEFAULT_RETENTION_DAYS;

    const supabase = adminClient();
    const {data, error} = await supabase.rpc('prune_client_events', {
      p_older_than_days: days,
    });
    if (error) {
      return databaseErrorResponse(req, 'prune_client_events failed', error);
    }

    return jsonResponse({ok: true, deleted: data ?? 0, days}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
