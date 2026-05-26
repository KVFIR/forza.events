-- Keep users.events_joined in sync with non-waitlisted registrations.

create or replace function sync_user_events_joined()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and not coalesce(new.waitlisted, false) then
    update users
    set events_joined = events_joined + 1
    where discord_id = new.discord_id;
  elsif tg_op = 'DELETE' and not coalesce(old.waitlisted, false) then
    update users
    set events_joined = greatest(0, events_joined - 1)
    where discord_id = old.discord_id;
  end if;
  return null;
end;
$$;

drop trigger if exists ep_sync_user_events_joined on event_participants;
create trigger ep_sync_user_events_joined
  after insert or delete on event_participants
  for each row
  execute function sync_user_events_joined();
