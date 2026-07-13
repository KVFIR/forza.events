import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {cronSecretOk} from '../_shared/cronSecret.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {processNotificationBatch} from '../_shared/notifications.ts';
import {scanStartingSoonReminders} from '../_shared/notificationTriggers.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);
  if (!cronSecretOk(req)) return jsonResponse({error: 'Unauthorized'}, 401, req);

  try {
    const supabase = adminClient();
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const scanReminders = body.scan_reminders !== false;

    if (scanReminders) {
      await scanStartingSoonReminders(supabase);
    }

    const result = await processNotificationBatch(supabase, 30);
    return jsonResponse({ok: true, ...result}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
