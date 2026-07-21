-- Concurrent-safe rating apply: relative delta + row locks (not absolute snapshot upsert).

create or replace function apply_event_rating_deltas(
  p_event_id uuid,
  p_deltas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_row   record;
  v_now   timestamptz := now();
  v_out   jsonb := '[]'::jsonb;
  v_id    text;
  v_before integer;
  v_after  integer;
  v_games  integer;
begin
  if p_deltas is null or jsonb_typeof(p_deltas) <> 'array' then
    raise exception 'BAD_REQUEST';
  end if;

  select * into v_event
  from events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if not coalesce(v_event.is_ranked, false) then
    raise exception 'BAD_REQUEST';
  end if;

  if coalesce(v_event.rating_applied, false) then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'discord_id', rl.discord_id,
          'rating_before', rl.rating_before,
          'rating_after', rl.rating_after,
          'delta', rl.delta
        )
        order by rl.discord_id
      ),
      '[]'::jsonb
    )
    into v_out
    from rating_ledger rl
    where rl.event_id = p_event_id;
    return v_out;
  end if;

  if jsonb_array_length(p_deltas) = 0 then
    update events
    set rating_applied = true
    where id = p_event_id;
    return '[]'::jsonb;
  end if;

  delete from rating_ledger where event_id = p_event_id;

  -- Stable lock order by discord_id (avoid deadlocks across concurrent event applies).
  for v_row in
    select *
    from jsonb_to_recordset(p_deltas) as x(
      discord_id text,
      rating_before integer,
      rating_after integer,
      delta integer,
      games_rated integer
    )
    order by trim(x.discord_id)
  loop
    v_id := trim(v_row.discord_id);
    if v_id is null or v_id = '' then
      raise exception 'BAD_REQUEST';
    end if;
    if v_row.delta is null then
      raise exception 'BAD_REQUEST';
    end if;

    insert into player_ratings (discord_id, rating, games_rated, updated_at)
    values (v_id, 1000, 0, v_now)
    on conflict (discord_id) do nothing;

    select rating, games_rated
      into v_before, v_games
    from player_ratings
    where discord_id = v_id
    for update;

    v_after := greatest(0, v_before + v_row.delta);

    update player_ratings
    set rating = v_after,
        games_rated = v_games + 1,
        updated_at = v_now
    where discord_id = v_id;

    insert into rating_ledger (
      event_id, discord_id, rating_before, rating_after, delta, created_at
    )
    values (
      p_event_id,
      v_id,
      v_before,
      v_after,
      v_after - v_before,
      v_now
    );

    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'discord_id', v_id,
        'rating_before', v_before,
        'rating_after', v_after,
        'delta', v_after - v_before
      )
    );
  end loop;

  update events
  set rating_applied = true
  where id = p_event_id;

  return v_out;
end;
$$;

revoke all on function apply_event_rating_deltas(uuid, jsonb) from public;
grant execute on function apply_event_rating_deltas(uuid, jsonb) to service_role;
