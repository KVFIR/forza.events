-- Ranked driver skill rating (pairwise ELO). Guild allowlist gates hosting ranked events.

create table rating_enabled_guilds (
  guild_id   text        primary key,
  enabled_at timestamptz not null default now(),
  note       text
);

alter table events
  add column if not exists is_ranked boolean not null default false,
  add column if not exists rating_applied boolean not null default false;

create table player_ratings (
  discord_id  text        primary key references users(discord_id) on delete cascade,
  rating      integer     not null default 1000,
  games_rated integer     not null default 0,
  updated_at  timestamptz not null default now(),
  constraint player_ratings_rating_check check (rating >= 0),
  constraint player_ratings_games_check check (games_rated >= 0)
);

create index player_ratings_rating_idx on player_ratings (rating desc, games_rated desc);

create table rating_ledger (
  event_id       uuid        not null references events(id) on delete cascade,
  discord_id     text        not null references users(discord_id) on delete cascade,
  rating_before  integer     not null,
  rating_after   integer     not null,
  delta          integer     not null,
  created_at     timestamptz not null default now(),
  primary key (event_id, discord_id)
);

create index rating_ledger_discord_id_idx on rating_ledger (discord_id, created_at desc);

alter table rating_enabled_guilds enable row level security;
alter table player_ratings enable row level security;
alter table rating_ledger enable row level security;

-- Public ladder + results Δ (mutations via service role only).
create policy "public player_ratings readable"
  on player_ratings for select
  using (true);

create policy "rating_ledger of public events readable"
  on rating_ledger for select
  using (
    exists (
      select 1 from events e
      where e.id = rating_ledger.event_id
        and e.status <> 'draft'
    )
  );
