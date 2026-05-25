import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {EVENT_LIST_SELECT} from '../_shared/eventListSelect.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const includeCompleted = Boolean(body.include_completed);
    const eventId = typeof body.event_id === 'string' ? body.event_id : null;

    const supabase = adminClient();

    if (eventId) {
      const {data, error} = await supabase
        .from('events')
        .select(EVENT_LIST_SELECT)
        .eq('id', eventId)
        .neq('status', 'draft')
        .maybeSingle();

      if (error) {
        console.error('browse-events', error);
        return jsonResponse({error: error.message}, 500);
      }

      return jsonResponse({data: data ? [data] : []});
    }

    let query = supabase
      .from('events')
      .select(EVENT_LIST_SELECT)
      .neq('status', 'draft')
      .order('starts_at', {ascending: true});

    if (!includeCompleted) {
      query = query.in('status', ['open', 'checkin', 'live']);
    }

    const {data, error} = await query;

    if (error) {
      console.error('browse-events', error);
      return jsonResponse({error: error.message}, 500);
    }

    return jsonResponse({data: data ?? []});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
