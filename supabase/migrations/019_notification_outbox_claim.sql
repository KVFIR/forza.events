-- Atomic outbox claim (parallel cron + waitUntil) + reclaim stale processing rows.

alter table notification_outbox
  drop constraint notification_outbox_status_check;

alter table notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

alter table notification_outbox
  add column if not exists claimed_at timestamptz;

create index if not exists notification_outbox_processing_stale_idx
  on notification_outbox (claimed_at)
  where status = 'processing';

create or replace function claim_notification_outbox_batch(p_limit int)
returns setof notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ponytail: 10m stale reclaim; add claimed_at-based alerting if workers hang often.
  update notification_outbox
  set status = 'pending', claimed_at = null
  where status = 'processing'
    and claimed_at is not null
    and claimed_at < now() - interval '10 minutes';

  return query
  update notification_outbox o
  set status = 'processing', claimed_at = now()
  from (
    select id
    from notification_outbox
    where status = 'pending'
      and scheduled_for <= now()
    order by scheduled_for
    limit greatest(coalesce(p_limit, 1), 1)
    for update skip locked
  ) picked
  where o.id = picked.id
  returning o.*;
end;
$$;
