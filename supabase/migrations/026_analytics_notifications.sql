-- Discord DM notification aggregates for local analytics dashboard.

create or replace function analytics_dashboard_summary(p_days integer default 7)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select now() - make_interval(days => greatest(least(coalesce(p_days, 7), 90), 1)) as since,
           greatest(least(coalesce(p_days, 7), 90), 1) as days
  ),
  base as (
    select ce.*
    from client_events ce
    cross join bounds b
    where ce.created_at >= b.since
  ),
  outbox_base as (
    select no.*
    from notification_outbox no
    cross join bounds b
    where no.created_at >= b.since
  ),
  outbox_metrics as (
    select
      count(*)::bigint as total,
      count(*) filter (where status = 'sent')::bigint as sent,
      count(*) filter (where status = 'failed')::bigint as failed,
      count(*) filter (where status = 'skipped')::bigint as skipped,
      count(*) filter (where status = 'pending')::bigint as pending,
      count(*) filter (where status = 'processing')::bigint as processing
    from outbox_base
  ),
  metrics as (
    select
      count(*)::bigint as total_events,
      count(distinct discord_id) filter (where discord_id is not null)::bigint as unique_users,
      count(*) filter (where event_name = 'session_start')::bigint as sessions,
      count(*) filter (where event_name = 'auth_success')::bigint as auth_ok,
      count(*) filter (where event_name = 'auth_failed')::bigint as auth_fail,
      count(*) filter (where event_name = 'browse_view')::bigint as browse_views,
      count(*) filter (where event_name = 'event_view')::bigint as event_views,
      count(*) filter (where event_name = 'join' and outcome = 'success')::bigint as join_ok,
      count(*) filter (where event_name = 'leave' and outcome = 'success')::bigint as leave_ok,
      count(*) filter (where event_name = 'publish' and outcome = 'success')::bigint as publish_ok,
      count(*) filter (where event_name = 'draft_save' and outcome = 'success')::bigint as draft_ok,
      count(*) filter (where event_name = 'cancel_event' and outcome = 'success')::bigint as cancel_ok,
      count(*) filter (where event_name = 'submit_results' and outcome = 'success')::bigint as results_ok,
      count(*) filter (where event_name = 'add_group' and outcome = 'success')::bigint as add_group_ok,
      count(*) filter (where event_name = 'change_group_leader' and outcome = 'success')::bigint as change_leader_ok,
      count(*) filter (where event_name = 'bot_install_click')::bigint as bot_install_clicks,
      count(*) filter (where event_name = 'empty_guild_list')::bigint as empty_guild_lists,
      count(*) filter (where event_name = 'session_expired')::bigint as session_expired,
      count(*) filter (where event_name = 'api_error')::bigint as api_errors,
      count(*) filter (
        where event_name = 'api_error'
          and function_name = 'event-participation'
          and coalesce(meta->>'action', 'join') = 'join'
      )::bigint as join_errors,
      count(*) filter (
        where event_name = 'api_error' and function_name = 'publish-event'
      )::bigint as publish_errors,
      count(*) filter (
        where event_name = 'api_error' and function_name = 'token-exchange'
      )::bigint as auth_exchange_errors,
      count(*) filter (where event_name = 'notification_dm_enable' and outcome = 'success')::bigint as notif_dm_enable,
      count(*) filter (where event_name = 'notification_dm_disable' and outcome = 'success')::bigint as notif_dm_disable,
      count(*) filter (
        where event_name = 'bot_install_click' and meta->>'source' = 'notification_dm_enable'
      )::bigint as notif_dm_bot_install
    from base
  )
  select jsonb_build_object(
    'days', (select days from bounds),
    'since', (select since from bounds),
    'total_events', (select total_events from metrics),
    'unique_users', (select unique_users from metrics),
    'sessions', (select sessions from metrics),
    'by_surface', coalesce((
      select jsonb_object_agg(surface::text, cnt)
      from (select surface, count(*)::bigint as cnt from base group by surface) s
    ), '{}'::jsonb),
    'unique_users_by_surface', coalesce((
      select jsonb_object_agg(surface::text, cnt)
      from (
        select surface, count(distinct discord_id)::bigint as cnt
        from base
        where discord_id is not null
        group by surface
      ) u
    ), '{}'::jsonb),
    'sessions_by_surface', coalesce((
      select jsonb_object_agg(surface::text, cnt)
      from (
        select surface, count(*)::bigint as cnt
        from base
        where event_name = 'session_start'
        group by surface
      ) s
    ), '{}'::jsonb),
    'funnel', coalesce((
      select jsonb_object_agg(event_name, cnt)
      from (
        select event_name, count(*)::bigint as cnt
        from base
        where outcome = 'success'
           or event_name in (
             'session_start', 'browse_view', 'event_view', 'create_open',
             'api_error', 'auth_failed', 'empty_guild_list', 'session_expired',
             'bot_install_click', 'notification_dm_enable', 'notification_dm_disable'
           )
        group by event_name
      ) f
    ), '{}'::jsonb),
    'funnel_by_surface', coalesce((
      select jsonb_object_agg(surface::text, events)
      from (
        select surface, jsonb_object_agg(event_name, cnt) as events
        from (
          select surface, event_name, count(*)::bigint as cnt
          from base
          where outcome = 'success'
             or event_name in (
               'session_start', 'browse_view', 'event_view', 'create_open',
               'api_error', 'auth_failed', 'empty_guild_list', 'session_expired',
               'bot_install_click', 'notification_dm_enable', 'notification_dm_disable'
             )
          group by surface, event_name
        ) grouped
        group by surface
      ) by_surf
    ), '{}'::jsonb),
    'conversion', (
      select jsonb_build_object(
        'auth', jsonb_build_object(
          'success', auth_ok,
          'failed', auth_fail + auth_exchange_errors,
          'rate', case
            when auth_ok + auth_fail + auth_exchange_errors > 0
            then round(100.0 * auth_ok / (auth_ok + auth_fail + auth_exchange_errors), 1)
            else null
          end
        ),
        'join', jsonb_build_object(
          'success', join_ok,
          'failed', join_errors,
          'rate', case
            when join_ok + join_errors > 0
            then round(100.0 * join_ok / (join_ok + join_errors), 1)
            else null
          end
        ),
        'publish', jsonb_build_object(
          'success', publish_ok,
          'failed', publish_errors,
          'rate', case
            when publish_ok + publish_errors > 0
            then round(100.0 * publish_ok / (publish_ok + publish_errors), 1)
            else null
          end
        ),
        'event_views_per_session', jsonb_build_object(
          'sessions', sessions,
          'event_views', event_views,
          'avg', case
            when sessions > 0
            then round(event_views::numeric / sessions, 2)
            else null
          end
        )
      )
      from metrics
    ),
    'host_actions', (
      select jsonb_build_object(
        'draft_save', draft_ok,
        'publish', publish_ok,
        'cancel_event', cancel_ok,
        'submit_results', results_ok,
        'add_group', add_group_ok,
        'change_group_leader', change_leader_ok,
        'empty_guild_list', empty_guild_lists,
        'bot_install_click', bot_install_clicks
      )
      from metrics
    ),
    'notifications', (
      select jsonb_build_object(
        'outbox_in_window', om.total,
        'by_status', jsonb_build_object(
          'sent', om.sent,
          'failed', om.failed,
          'skipped', om.skipped,
          'pending', om.pending,
          'processing', om.processing
        ),
        'by_kind', coalesce((
          select jsonb_object_agg(kind, cnt)
          from (
            select kind, count(*)::bigint as cnt
            from outbox_base
            group by kind
          ) k
        ), '{}'::jsonb),
        'by_kind_sent', coalesce((
          select jsonb_object_agg(kind, cnt)
          from (
            select kind, count(*)::bigint as cnt
            from outbox_base
            where status = 'sent'
            group by kind
          ) k
        ), '{}'::jsonb),
        'skip_reasons', coalesce((
          select jsonb_object_agg(reason, cnt)
          from (
            select coalesce(last_error, 'unknown') as reason, count(*)::bigint as cnt
            from outbox_base
            where status = 'skipped'
            group by 1
          ) s
        ), '{}'::jsonb),
        'delivery', jsonb_build_object(
          'sent', om.sent,
          'failed', om.failed,
          'rate', case
            when om.sent + om.failed > 0
            then round(100.0 * om.sent / (om.sent + om.failed), 1)
            else null
          end
        ),
        'backlog', (
          select jsonb_build_object(
            'pending', count(*) filter (where status = 'pending')::bigint,
            'processing', count(*) filter (where status = 'processing')::bigint
          )
          from notification_outbox
          where status in ('pending', 'processing')
        ),
        'dm_prefs', (
          select jsonb_build_object(
            'enabled', count(*) filter (where dm_notifications_enabled)::bigint,
            'disabled', count(*) filter (where not dm_notifications_enabled)::bigint
          )
          from users
        ),
        'client_prefs', (
          select jsonb_build_object(
            'dm_enable', m.notif_dm_enable,
            'dm_disable', m.notif_dm_disable,
            'dm_enable_blocked_bot_install', m.notif_dm_bot_install
          )
          from metrics m
        ),
        'recent_failures', coalesce((
          select jsonb_agg(row_to_json(t) order by t.at desc)
          from (
            select
              created_at as at,
              kind,
              last_error,
              attempts
            from outbox_base
            where status = 'failed'
            order by created_at desc
            limit 15
          ) t
        ), '[]'::jsonb),
        'daily', coalesce((
          select jsonb_agg(row_to_json(d) order by d.day)
          from (
            select
              date_trunc('day', created_at)::date as day,
              count(*) filter (where status = 'sent')::bigint as sent,
              count(*) filter (where status = 'failed')::bigint as failed,
              count(*) filter (where status = 'skipped')::bigint as skipped
            from outbox_base
            group by 1
          ) d
        ), '[]'::jsonb)
      )
      from outbox_metrics om
      cross join metrics m
    ),
    'top_errors', coalesce((
      select jsonb_agg(row_to_json(t) order by t.count desc)
      from (
        select
          coalesce(api_code, 'unknown') as code,
          function_name,
          count(*)::bigint as count
        from base
        where event_name = 'api_error'
        group by 1, 2
        order by count desc
        limit 20
      ) t
    ), '[]'::jsonb),
    'errors_by_surface', coalesce((
      select jsonb_object_agg(surface::text, cnt)
      from (
        select surface, count(*)::bigint as cnt
        from base
        where event_name = 'api_error'
        group by surface
      ) e
    ), '{}'::jsonb),
    'errors_by_function', coalesce((
      select jsonb_object_agg(function_name, cnt)
      from (
        select coalesce(function_name, 'unknown') as function_name, count(*)::bigint as cnt
        from base
        where event_name = 'api_error'
        group by 1
      ) f
    ), '{}'::jsonb),
    'recent_errors', coalesce((
      select jsonb_agg(row_to_json(t) order by t.at desc)
      from (
        select
          created_at as at,
          surface::text as surface,
          coalesce(api_code, 'unknown') as code,
          function_name,
          http_status,
          event_id
        from base
        where event_name = 'api_error'
        order by created_at desc
        limit 25
      ) t
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(row_to_json(d) order by d.day)
      from (
        select
          date_trunc('day', created_at)::date as day,
          count(*)::bigint as events,
          count(distinct discord_id)::bigint as users,
          count(*) filter (where event_name = 'api_error')::bigint as errors
        from base
        group by 1
      ) d
    ), '[]'::jsonb)
  );
$$;

revoke all on function analytics_dashboard_summary(integer) from public;
grant execute on function analytics_dashboard_summary(integer) to service_role;
