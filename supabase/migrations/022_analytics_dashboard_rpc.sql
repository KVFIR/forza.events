-- Aggregated analytics for the localhost-only dashboard (service_role / Edge only).

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
  )
  select jsonb_build_object(
    'days', (select days from bounds),
    'since', (select since from bounds),
    'total_events', (select count(*)::bigint from base),
    'unique_users', (
      select count(distinct discord_id)::bigint from base where discord_id is not null
    ),
    'by_surface', coalesce((
      select jsonb_object_agg(surface::text, cnt)
      from (select surface, count(*)::bigint as cnt from base group by surface) s
    ), '{}'::jsonb),
    'funnel', coalesce((
      select jsonb_object_agg(event_name, cnt)
      from (
        select event_name, count(*)::bigint as cnt
        from base
        where outcome = 'success'
           or event_name in ('session_start', 'api_error', 'auth_failed', 'empty_guild_list')
        group by event_name
      ) f
    ), '{}'::jsonb),
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
    'daily', coalesce((
      select jsonb_agg(row_to_json(d) order by d.day)
      from (
        select
          date_trunc('day', created_at)::date as day,
          count(*)::bigint as events,
          count(distinct discord_id)::bigint as users
        from base
        group by 1
      ) d
    ), '[]'::jsonb)
  );
$$;

revoke all on function analytics_dashboard_summary(integer) from public;
grant execute on function analytics_dashboard_summary(integer) to service_role;
