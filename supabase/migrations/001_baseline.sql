-- Baseline schema — squash of migrations 001–024
-- Generated 2026-05-27 from live schema (project: uoysqfczahqmctbrrizn)
-- Seeds (cars catalog, sample events) are NOT included here.
-- Run `npm run seed:events` separately after applying this migration.

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists pg_trgm;

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type event_status  as enum ('draft','open','checkin','live','completed','cancelled','archived');
create type car_class     as enum ('D','C','B','A','S1','S2','X','open','R');
create type platform_type as enum ('xbox','pc','crossplay');
create type region_type   as enum ('eu','na','sa','apac','global');
create type reminder_offset as enum ('24h','1h','10min');
create type voice_policy  as enum ('required','optional','none');
create type event_type    as enum ('road','dirt','drift','touge','cruise');
create type car_setup_mode as enum ('general','prescribed_tunes');
create type car_rule_mode  as enum ('anything_goes','restricted_list');

-- ============================================================
-- TABLES (dependency order)
-- ============================================================

create table discord_guilds (
  guild_id            text primary key,
  guild_name          text not null,
  icon_url            text,
  event_channel_id    text,
  event_role_prefix   text default 'event: ',
  cleanup_hours       integer default 2,
  settings            jsonb default '{}',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table users (
  id                uuid        primary key default gen_random_uuid(),
  discord_id        text        not null unique,
  username          text        not null,
  discriminator     text,
  avatar_url        text,
  xbox_gamertag     text,
  region            region_type,
  timezone          text,
  languages         text[]      default '{}',
  preferred_types   event_type[],
  events_joined     integer     not null default 0,
  events_hosted     integer     not null default 0,
  no_shows          integer     not null default 0,
  attendance_rate   numeric     default 100.00,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table cars (
  id          uuid        primary key default gen_random_uuid(),
  make        text        not null,
  model       text        not null,
  year        integer,
  search_text text,
  active      boolean     default true,
  created_at  timestamptz default now(),
  pi          integer     not null
);

create table events (
  id                          uuid          primary key default gen_random_uuid(),
  slug                        text          not null unique,
  title                       text          not null,
  type                        event_type    not null,
  status                      event_status  not null default 'open',
  host_discord_id             text          not null references users(discord_id) on delete restrict,
  guild_id                    text          not null references discord_guilds(guild_id),
  channel_id                  text,
  thread_id                   text,
  voice_channel_id            text,
  discord_message_id          text,
  starts_at                   timestamptz   not null,
  ends_at                     timestamptz,
  platform                    platform_type default 'crossplay',
  region                      region_type   default 'global',
  voice_policy                voice_policy  default 'optional',
  max_players                 integer       not null default 16,
  current_players             integer       not null default 0,
  web_url                     text,
  created_at                  timestamptz   default now(),
  updated_at                  timestamptz   default now(),
  cover_image_url             text,
  description                 text,
  track_codes                 text[]        default '{}',
  rules_allowed               text[]        default '{}',
  rules_forbidden             text[]        default '{}',
  lobby_leader_gamertag       text          not null default 'TBD',
  lobby_leader_is_host        boolean       default true,
  timezone_hint               text,
  max_pi                      integer       not null default 999,
  car_setup_mode              car_setup_mode default 'general',
  tuning_restrictions         text[]        default '{}',
  event_share_code            text,
  car_rule_mode               car_rule_mode not null default 'anything_goes',
  additional_car_restrictions text,
  lobby_leader_discord_id     text          references users(discord_id) on delete set null
);

create table event_participants (
  event_id             uuid             not null references events(id) on delete cascade,
  discord_id           text             not null references users(discord_id) on delete cascade,
  reminder_offsets     reminder_offset[] default '{}',
  checked_in           boolean          default false,
  waitlisted           boolean          default false,
  joined_at            timestamptz      default now(),
  gamertag_snapshot    text,
  is_convoy_leader     boolean          not null default false,
  participation_source text             not null default 'self_join',
  primary key (event_id, discord_id),
  constraint ep_participation_source_check check (
    participation_source in ('self_join','host_assigned','host_self_assigned')
  )
);

create table event_cars (
  event_id         uuid     not null references events(id) on delete cascade,
  car_id           uuid     not null references cars(id) on delete cascade,
  tune_share_code  text,
  max_pi           integer  not null default 999,
  car_restrictions text[]   not null default '{}',
  primary key (event_id, car_id)
);

create table event_results (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references events(id) on delete cascade,
  discord_id   text        not null references users(discord_id),
  position     integer,
  points       integer,
  dnf          boolean     default false,
  notes        text,
  submitted_at timestamptz default now(),
  dns          boolean     not null default false
);

create table host_ratings (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references events(id) on delete cascade,
  rater_id   text        not null references users(discord_id),
  host_id    text        not null references users(discord_id),
  rating     integer     not null,
  comment    text,
  created_at timestamptz default now(),
  unique (event_id, rater_id)
);

create table reminder_log (
  id          uuid            primary key default gen_random_uuid(),
  event_id    uuid            not null references events(id) on delete cascade,
  discord_id  text            not null references users(discord_id),
  offset_sent reminder_offset not null,
  sent_at     timestamptz     default now(),
  unique (event_id, discord_id, offset_sent)
);

create table launch_intents (
  id         uuid        primary key default gen_random_uuid(),
  discord_id text        not null,
  guild_id   text,
  event_id   uuid        not null references events(id) on delete cascade,
  created_at timestamptz default now()
);

create table api_rate_limits (
  key           text        primary key,
  window_start  timestamptz not null,
  request_count integer     not null default 0
);

-- ============================================================
-- INDEXES
-- ============================================================

create index cars_pi_idx     on cars using btree (pi) where active = true;
create index cars_search_idx on cars using gin (search_text gin_trgm_ops);

create index ep_discord_id_idx on event_participants using btree (discord_id);
create index ep_event_id_idx   on event_participants using btree (event_id);
create unique index ep_one_convoy_leader_per_event_idx
  on event_participants (event_id) where is_convoy_leader = true;

create unique index event_results_event_finish_position_idx
  on event_results using btree (event_id, position) where position is not null;

create index events_guild_id_idx           on events using btree (guild_id);
create index events_host_discord_id_idx    on events using btree (host_discord_id);
create index events_lobby_leader_discord_id_idx
  on events using btree (lobby_leader_discord_id) where lobby_leader_discord_id is not null;
create index events_starts_at_idx on events using btree (starts_at);
create index events_status_idx    on events using btree (status);

create index li_created_at    on launch_intents using btree (created_at);
create index li_discord_recent on launch_intents using btree (discord_id, created_at desc);
create index li_lookup         on launch_intents using btree (discord_id, guild_id);

create index users_discord_id_idx on users using btree (discord_id);

-- ============================================================
-- REPLICA IDENTITY
-- ============================================================
alter table events replica identity full;

-- ============================================================
-- FUNCTIONS
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function update_current_players()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and not new.waitlisted then
    update events set current_players = current_players + 1 where id = new.event_id;
  elsif tg_op = 'DELETE' and not old.waitlisted then
    update events set current_players = current_players - 1 where id = old.event_id;
  end if;
  return null;
end;
$$;

create or replace function sync_user_events_joined()
returns trigger language plpgsql as $$
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

create or replace function enforce_event_participant_capacity()
returns trigger language plpgsql as $$
declare
  v_max    int;
  v_active int;
begin
  if coalesce(new.waitlisted, false) then
    return new;
  end if;

  select max_players into v_max
  from events
  where id = new.event_id
  for update;

  if v_max is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  select count(*)::int into v_active
  from event_participants
  where event_id = new.event_id
    and not coalesce(waitlisted, false)
    and discord_id is distinct from new.discord_id;

  if v_active >= v_max then
    raise exception 'EVENT_FULL';
  end if;

  return new;
end;
$$;

create or replace function check_api_rate_limit(
  p_key            text,
  p_max            integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_now   timestamptz := now();
  v_count int;
  v_start timestamptz;
begin
  if p_max < 1 or p_window_seconds < 1 then
    return true;
  end if;

  select request_count, window_start
  into v_count, v_start
  from api_rate_limits
  where key = p_key
  for update;

  if not found then
    insert into api_rate_limits (key, window_start, request_count)
    values (p_key, v_now, 1);
    return true;
  end if;

  if v_now >= v_start + make_interval(secs => p_window_seconds) then
    update api_rate_limits
    set window_start = v_now, request_count = 1
    where key = p_key;
    return true;
  end if;

  if v_count >= p_max then
    return false;
  end if;

  update api_rate_limits
  set request_count = request_count + 1
  where key = p_key;
  return true;
end;
$$;

create or replace function prune_api_rate_limits(p_older_than_seconds integer)
returns void
language sql
security definer
as $$
  delete from api_rate_limits
  where window_start < now() - make_interval(secs => p_older_than_seconds);
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger guilds_updated_at
  before update on discord_guilds
  for each row execute function set_updated_at();

create trigger users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- Fires on INSERT and UPDATE: covers self-join, host-leader upsert, waitlist→active promotion.
create trigger ep_capacity_enforcement
  before insert or update on event_participants
  for each row execute function enforce_event_participant_capacity();

create trigger ep_count_trigger
  after insert or delete on event_participants
  for each row execute function update_current_players();

create trigger ep_sync_user_events_joined
  after insert or delete on event_participants
  for each row execute function sync_user_events_joined();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table discord_guilds    enable row level security;
alter table users             enable row level security;
alter table events            enable row level security;
alter table event_participants enable row level security;
alter table event_cars        enable row level security;
alter table event_results     enable row level security;
alter table host_ratings      enable row level security;
alter table reminder_log      enable row level security;
alter table cars              enable row level security;
alter table launch_intents    enable row level security;
alter table api_rate_limits   enable row level security;

create policy "public discord_guilds readable"
  on discord_guilds for select to public using (true);

create policy "users visible in public events"
  on users for select to public
  using (
    (exists (
      select 1 from events e
      where e.host_discord_id = users.discord_id
        and e.status <> 'draft'::event_status
    ))
    or
    (exists (
      select 1 from event_participants ep
      join events e on e.id = ep.event_id
      where ep.discord_id = users.discord_id
        and e.status <> 'draft'::event_status
    ))
  );

create policy "public events readable"
  on events for select to public using (status <> 'draft'::event_status);

create policy "participants of public events readable"
  on event_participants for select to public
  using (
    exists (
      select 1 from events e
      where e.id = event_participants.event_id
        and e.status <> 'draft'::event_status
    )
  );

create policy "public event_cars readable"
  on event_cars for select to public using (true);

create policy "results of public events readable"
  on event_results for select to public
  using (
    exists (
      select 1 from events e
      where e.id = event_results.event_id
        and e.status <> 'draft'::event_status
    )
  );

create policy "public cars readable"
  on cars for select to public using (active = true);

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
alter publication supabase_realtime add table events, event_participants;

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

create policy "public cover read"
  on storage.objects for select to public
  using (bucket_id = 'event-covers');
