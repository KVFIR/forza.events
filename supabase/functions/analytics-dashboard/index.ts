import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {
  dashboardSecretOk,
  isLocalDashboardRequest,
} from '../_shared/dashboardAccess.ts';
import {clientIp, jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {rateLimitOr429} from '../_shared/rateLimit.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  if (!isLocalDashboardRequest(req) || !dashboardSecretOk(req)) {
    return jsonResponse({error: 'Forbidden'}, 403, req);
  }

  const limited = await rateLimitOr429(req, `analytics-dash:${clientIp(req)}`, 30, 60);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const daysRaw = Number(body?.days ?? 7);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 90) : 7;

    const supabase = adminClient();
    const {data, error} = await supabase.rpc('analytics_dashboard_summary', {p_days: days});
    if (error) {
      console.error(JSON.stringify({msg: 'analytics_dashboard_summary failed', detail: error.message}));
      return jsonResponse({error: 'Internal error'}, 500, req);
    }

    return jsonResponse({ok: true, summary: data}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
