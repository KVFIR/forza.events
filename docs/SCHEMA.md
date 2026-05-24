# FORZA.EVENTS — Database Schema

Supabase (PostgreSQL). All tables have Row Level Security enabled.  
The bot uses the **service role key** (bypasses RLS).  
The web reads public data via the **anon key** (respects RLS).

---

## Migration files

- `supabase/migrations/001_initial.sql`
- `supabase/migrations/002_engineering_plan.sql`
- `supabase/migrations/003_storage_upload_policy.sql`
- `supabase/migrations/004_event_types_and_pi.sql`
- `supabase/migrations/005_fh6_cars_catalog.sql`
- `supabase/migrations/006_car_setup_model.sql`
- `supabase/migrations/007_per_car_setup.sql`

```sql
-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ─────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────

create type event_type as enum (
  'race',
  'tournament',
  'cruise',
  'drift',
  'meet',
  'convoy',
  'eliminator',
  'championship',
  'challenge'
);

create type event_status as enum (
  'draft',
  'open',        -- registration open
  'checkin',     -- check-in window active
  'live',        -- event running
  'completed',
  'cancelled',
  'archived'
);

create type car_class as enum (
  'D',
  'C',
  'B',
  'A',
  'S1',
  'S2',
  'X',
  'open'
);

create type platform_type as enum (
  'xbox',
  'pc',
  'crossplay'
);

create type region_type as enum (
  'eu',
  'na',
  'sa',
  'apac',
  'global'
);

create type reminder_offset as enum (
  '24h',
  '1h',
  '10min'
);

create type voice_policy as enum (
  'required',
  'optional',
  'none'
);


-- ─────────────────────────────────────────────
-- discord_guilds
-- ─────────────────────────────────────────────

create table discord_guilds (
  guild_id          text        primary key,
  guild_name        text        not null,
  icon_url          text,

  -- configuration set by server admin via /setup
  event_channel_id  text,                         -- default channel for event embeds
  event_role_prefix text        default 'event: ',
  cleanup_hours     int         default 2,         -- hours after event end before thread archived

  settings          jsonb       default '{}',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);


-- ─────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────

create table users (
  id                uuid        primary key default uuid_generate_v4(),
  discord_id        text        unique not null,
  username          text        not null,
  discriminator     text,                          -- legacy Discord tag, may be empty
  avatar_url        text,

  xbox_gamertag     text,
  region            region_type,
  timezone          text,                          -- IANA tz string, e.g. "Europe/Riga"
  languages         text[]      default '{}',
  preferred_types   event_type[] default '{}',

  -- aggregate stats (denormalised for fast profile reads)
  events_joined     int         default 0 not null,
  events_hosted     int         default 0 not null,
  no_shows          int         default 0 not null,
  attendance_rate   numeric(5,2) default 100.00,  -- recomputed on each check-in window close

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index users_discord_id_idx on users(discord_id);


-- ─────────────────────────────────────────────
-- events
-- ─────────────────────────────────────────────

create table events (
  id                uuid          primary key default uuid_generate_v4(),
  slug              text          unique not null,  -- url-safe, e.g. "a-class-cup-20260510"

  title             text          not null,
  type              event_type    not null,
  status            event_status  not null default 'open',

  -- host
  host_discord_id   text          not null references users(discord_id) on delete restrict,

  -- discord location
  guild_id          text          not null references discord_guilds(guild_id),
  channel_id        text          not null,         -- channel where embed was posted
  thread_id         text,                           -- auto-created thread
  voice_channel_id  text,                           -- linked voice channel (optional)
  discord_message_id text,                          -- message id of the embed (for edits)

  -- scheduling
  starts_at         timestamptz   not null,
  ends_at           timestamptz,                    -- optional estimated end
  checkin_opens_at  timestamptz                     -- computed: starts_at - 30min
    generated always as (starts_at - interval '30 minutes') stored,

  -- event config
  car_class         car_class,
  platform          platform_type default 'crossplay',
  region            region_type   not null,
  voice_policy      voice_policy  default 'optional',

  max_players       int           not null default 16,
  current_players   int           not null default 0,

  rules_text        text,
  notes             text,

  -- web
  web_url           text          generated always as (
                      'https://forza.events/e/' || slug
                    ) stored,

  created_at        timestamptz   default now(),
  updated_at        timestamptz   default now()
);

create index events_guild_id_idx       on events(guild_id);
create index events_status_idx         on events(status);
create index events_starts_at_idx      on events(starts_at);
create index events_host_discord_id_idx on events(host_discord_id);


-- ─────────────────────────────────────────────
-- event_participants
-- ─────────────────────────────────────────────

create table event_participants (
  event_id          uuid          not null references events(id) on delete cascade,
  discord_id        text          not null references users(discord_id) on delete cascade,

  reminder_offsets  reminder_offset[] default '{}',
  checked_in        boolean       default false,
  waitlisted        boolean       default false,

  joined_at         timestamptz   default now(),

  primary key (event_id, discord_id)
);

create index ep_event_id_idx     on event_participants(event_id);
create index ep_discord_id_idx   on event_participants(discord_id);
create index ep_reminder_idx     on event_participants(event_id, reminder_offsets)
  where reminder_offsets != '{}';


-- ─────────────────────────────────────────────
-- event_results
-- ─────────────────────────────────────────────

create table event_results (
  id                uuid    primary key default uuid_generate_v4(),
  event_id          uuid    not null references events(id) on delete cascade,
  discord_id        text    not null references users(discord_id),

  position          int     not null,   -- 1 = first
  points            int,                -- optional, for points-based events
  dnf               boolean default false,
  notes             text,

  submitted_at      timestamptz default now(),

  unique (event_id, position)
);

create index er_event_id_idx on event_results(event_id);


-- ─────────────────────────────────────────────
-- host_ratings
-- ─────────────────────────────────────────────
-- Participants rate the host after an event ends (v2 feature, table ready now).

create table host_ratings (
  id          uuid    primary key default uuid_generate_v4(),
  event_id    uuid    not null references events(id) on delete cascade,
  rater_id    text    not null references users(discord_id),
  host_id     text    not null references users(discord_id),
  rating      int     not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),

  unique (event_id, rater_id)
);


-- ─────────────────────────────────────────────
-- reminder_log
-- ─────────────────────────────────────────────
-- Tracks which reminders have been sent to avoid duplicate DMs.

create table reminder_log (
  id          uuid    primary key default uuid_generate_v4(),
  event_id    uuid    not null references events(id) on delete cascade,
  discord_id  text    not null references users(discord_id),
  offset_sent reminder_offset not null,
  sent_at     timestamptz default now(),

  unique (event_id, discord_id, offset_sent)
);


-- ─────────────────────────────────────────────
-- Triggers: updated_at
-- ─────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();

create trigger users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger guilds_updated_at
  before update on discord_guilds
  for each row execute function set_updated_at();


-- ─────────────────────────────────────────────
-- Trigger: current_players count
-- ─────────────────────────────────────────────

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


-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

alter table discord_guilds        enable row level security;
alter table users                 enable row level security;
alter table events                enable row level security;
alter table event_participants    enable row level security;
alter table event_results         enable row level security;
alter table host_ratings          enable row level security;
alter table reminder_log          enable row level security;

-- Web (anon): read-only access to public event data
create policy "public events readable"
  on events for select using (status != 'draft');

create policy "public results readable"
  on event_results for select using (true);

create policy "public users readable"
  on users for select using (true);

-- Bot uses service_role key and bypasses RLS entirely.
-- No additional policies needed for bot writes.
```

---

## Entity relationships

```
discord_guilds
    │
    └── events (guild_id)
            │
            ├── event_participants (event_id) ──── users (discord_id)
            │       │
            │       └── reminder_log
            │
            ├── event_results ──── users
            └── host_ratings  ──── users (rater + host)
```

---

## Key design decisions

### Slugs on events

`slug` is a URL-safe string used in web permalinks (`forza.events/e/a-class-cup-20260510`).  
Generated by the bot at insert time: `kebabCase(title) + '-' + YYYYMMDD`.  
Guaranteed unique via `unique` constraint; bot appends `-2`, `-3` etc. on collision.

### discord_id as text, not FK to users.id

Discord IDs are stable and unique. Using them directly as foreign keys avoids join overhead and simplifies bot code (Discord always gives us the snowflake, not a UUID).  
`users.discord_id` is `unique not null`, so FK references are valid.

### current_players denormalised on events

Avoids a `count(*)` query every time an embed needs to show `6/16`.  
Maintained by trigger on `event_participants`.

### checkin_opens_at as generated column

Always exactly 30 minutes before `starts_at`. No code needed to set it; scheduler just queries `WHERE checkin_opens_at <= now() AND status = 'open'`.

### reminder_log deduplication

The scheduler runs every minute. Without the log, a reminder DM could be sent multiple times. The `unique` constraint on `(event_id, discord_id, offset_sent)` makes the insert idempotent — the bot can upsert safely.

### host_ratings ready but not wired in MVP

Table exists so the schema doesn't need migration later. The bot will surface it in v2 with a post-event DM: *"Rate KVFIR as a host: ⭐⭐⭐⭐⭐"*

---

## Indexes summary

| Table | Index | Why |
|---|---|---|
| users | `discord_id` | Every interaction looks up by Discord snowflake |
| events | `guild_id` | List query always filters by guild |
| events | `status` | Scheduler filters `open`, `checkin`, `live` |
| events | `starts_at` | Range queries, ordering |
| event_participants | `event_id` | Join/leave/checkin |
| event_participants | `discord_id` | Profile stats, "events I joined" |
| event_participants | partial on `reminder_offsets != '{}'` | Scheduler skips rows with no reminders |

---

## Supabase project setup

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Init (in repo root)
supabase init

# Link to remote project
supabase link --project-ref <your-project-ref>

# Apply migration
supabase db push
# or
supabase migration up
```
