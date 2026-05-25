-- FORZA.EVENTS — initial schema; current MVP alignment is documented in docs/PLAN.md and docs/STATUS.md

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create type event_type as enum (
  'race', 'tournament', 'cruise', 'drift', 'meet', 'convoy',
  'eliminator', 'championship', 'challenge'
);

create type event_status as enum (
  'draft', 'open', 'checkin', 'live', 'completed', 'cancelled', 'archived'
);

create type car_class as enum (
  'D', 'C', 'B', 'A', 'S1', 'S2', 'X', 'open'
);

create type platform_type as enum ('xbox', 'pc', 'crossplay');
create type region_type as enum ('eu', 'na', 'sa', 'apac', 'global');
create type reminder_offset as enum ('24h', '1h', '10min');
create type voice_policy as enum ('required', 'optional', 'none');

create table discord_guilds (
  guild_id          text primary key,
  guild_name        text not null,
  icon_url          text,
  event_channel_id  text,
  event_role_prefix text default 'event: ',
  cleanup_hours     int default 2,
  settings          jsonb default '{}',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table users (
  id                uuid primary key default uuid_generate_v4(),
  discord_id        text unique not null,
  username          text not null,
  discriminator     text,
  avatar_url        text,
  xbox_gamertag     text,
  region            region_type,
  timezone          text,
  languages         text[] default '{}',
  preferred_types   event_type[] default '{}',
  events_joined     int default 0 not null,
  events_hosted     int default 0 not null,
  no_shows          int default 0 not null,
  attendance_rate   numeric(5,2) default 100.00,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index users_discord_id_idx on users(discord_id);

create table events (
  id                 uuid primary key default uuid_generate_v4(),
  slug               text unique not null,
  title              text not null,
  type               event_type not null,
  status             event_status not null default 'open',
  host_discord_id    text not null references users(discord_id) on delete restrict,
  guild_id           text not null references discord_guilds(guild_id),
  channel_id         text,
  thread_id          text,
  voice_channel_id   text,
  discord_message_id text,
  starts_at          timestamptz not null,
  ends_at            timestamptz,
  checkin_opens_at   timestamptz generated always as (starts_at - interval '30 minutes') stored,
  car_class          car_class,
  platform           platform_type default 'crossplay',
  region             region_type not null,
  voice_policy       voice_policy default 'optional',
  max_players        int not null default 16,
  current_players    int not null default 0,
  rules_text         text,
  notes              text,
  web_url            text generated always as ('https://forza.events/e/' || slug) stored,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index events_guild_id_idx on events(guild_id);
create index events_status_idx on events(status);
create index events_starts_at_idx on events(starts_at);
create index events_host_discord_id_idx on events(host_discord_id);

create table event_participants (
  event_id          uuid not null references events(id) on delete cascade,
  discord_id        text not null references users(discord_id) on delete cascade,
  reminder_offsets  reminder_offset[] default '{}',
  checked_in        boolean default false,
  waitlisted        boolean default false,
  joined_at         timestamptz default now(),
  primary key (event_id, discord_id)
);

create index ep_event_id_idx on event_participants(event_id);
create index ep_discord_id_idx on event_participants(discord_id);

create table event_results (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid not null references events(id) on delete cascade,
  discord_id   text not null references users(discord_id),
  position     int not null,
  points       int,
  dnf          boolean default false,
  notes        text,
  submitted_at timestamptz default now(),
  unique (event_id, position)
);

create table host_ratings (
  id         uuid primary key default uuid_generate_v4(),
  event_id   uuid not null references events(id) on delete cascade,
  rater_id   text not null references users(discord_id),
  host_id    text not null references users(discord_id),
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now(),
  unique (event_id, rater_id)
);

create table reminder_log (
  id          uuid primary key default uuid_generate_v4(),
  event_id    uuid not null references events(id) on delete cascade,
  discord_id  text not null references users(discord_id),
  offset_sent reminder_offset not null,
  sent_at     timestamptz default now(),
  unique (event_id, discord_id, offset_sent)
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at
  before update on events for each row execute function set_updated_at();
create trigger users_updated_at
  before update on users for each row execute function set_updated_at();
create trigger guilds_updated_at
  before update on discord_guilds for each row execute function set_updated_at();

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

create trigger ep_count_trigger
  after insert or delete on event_participants
  for each row execute function update_current_players();

alter table discord_guilds enable row level security;
alter table users enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table event_results enable row level security;
alter table host_ratings enable row level security;
alter table reminder_log enable row level security;

create policy "public events readable"
  on events for select using (status != 'draft');

create policy "public results readable"
  on event_results for select using (true);

create policy "public users readable"
  on users for select using (true);

create policy "public participants readable"
  on event_participants for select using (true);
