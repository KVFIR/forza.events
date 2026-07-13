-- Discord DM notification outbox + user prefs; leave RPC returns promoted racer id.

alter table users
  add column if not exists dm_notifications_enabled boolean not null default true,
  add column if not exists notification_locale text not null default 'en';

alter table users
  add constraint users_notification_locale_check
  check (notification_locale in ('en', 'ru'));

create table notification_outbox (
  id                    uuid        primary key default gen_random_uuid(),
  kind                  text        not null,
  event_id              uuid        not null references events(id) on delete cascade,
  recipient_discord_id  text        not null references users(discord_id) on delete cascade,
  payload               jsonb       not null default '{}',
  dedupe_key            text        not null unique,
  status                text        not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts              smallint    not null default 0,
  last_error            text,
  scheduled_for         timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  sent_at               timestamptz
);

create index notification_outbox_pending_idx
  on notification_outbox (scheduled_for)
  where status = 'pending';

alter table notification_outbox enable row level security;

-- leave_event_participant: return promoted waitlist racer id for DM enqueue.
create or replace function leave_event_participant(
  p_event_id uuid,
  p_discord_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_index   smallint;
  v_waitlisted    boolean;
  v_is_leader     boolean;
  v_promoted      text;
begin
  select group_index, coalesce(waitlisted, false), coalesce(is_convoy_leader, false)
  into v_group_index, v_waitlisted, v_is_leader
  from event_participants
  where event_id = p_event_id
    and discord_id = p_discord_id
  for update;

  if not found then
    return jsonb_build_object('removed', false, 'promoted_discord_id', null);
  end if;

  if v_is_leader then
    raise exception 'LEADER_CANNOT_LEAVE';
  end if;

  delete from event_participants
  where event_id = p_event_id
    and discord_id = p_discord_id;

  v_promoted := null;
  if not v_waitlisted then
    v_promoted := promote_waitlist_to_group(p_event_id, coalesce(v_group_index, 1::smallint));
  end if;

  return jsonb_build_object('removed', true, 'promoted_discord_id', v_promoted);
end;
$$;
