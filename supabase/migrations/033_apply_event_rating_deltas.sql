-- Atomic apply of ranked ELO deltas (player_ratings + ledger + rating_applied).

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
  v_out   jsonb;
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

  -- Idempotent: already applied → return existing ledger.
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

  -- No eligible drivers (all groups below min field) — still seal the event.
  if jsonb_array_length(p_deltas) = 0 then
    update events
    set rating_applied = true
    where id = p_event_id;
    return '[]'::jsonb;
  end if;

  -- Drop any leftover ledger rows from a pre-033 partial write.
  delete from rating_ledger where event_id = p_event_id;

  for v_row in
    select *
    from jsonb_to_recordset(p_deltas) as x(
      discord_id text,
      rating_before integer,
      rating_after integer,
      delta integer,
      games_rated integer
    )
  loop
    if v_row.discord_id is null or trim(v_row.discord_id) = '' then
      raise exception 'BAD_REQUEST';
    end if;
    if v_row.rating_after is null or v_row.rating_before is null or v_row.delta is null then
      raise exception 'BAD_REQUEST';
    end if;
    if v_row.games_rated is null or v_row.games_rated < 1 then
      raise exception 'BAD_REQUEST';
    end if;

    insert into player_ratings (discord_id, rating, games_rated, updated_at)
    values (
      trim(v_row.discord_id),
      greatest(0, v_row.rating_after),
      v_row.games_rated,
      v_now
    )
    on conflict (discord_id) do update
      set rating = excluded.rating,
          games_rated = excluded.games_rated,
          updated_at = excluded.updated_at;

    insert into rating_ledger (
      event_id, discord_id, rating_before, rating_after, delta, created_at
    )
    values (
      p_event_id,
      trim(v_row.discord_id),
      v_row.rating_before,
      greatest(0, v_row.rating_after),
      v_row.delta,
      v_now
    );
  end loop;

  update events
  set rating_applied = true
  where id = p_event_id;

  return p_deltas;
end;
$$;

revoke all on function apply_event_rating_deltas(uuid, jsonb) from public;
grant execute on function apply_event_rating_deltas(uuid, jsonb) to service_role;
