-- Restricted-list cars keep the order the host added them.
-- Nested PostgREST event_cars(*) otherwise comes back in PK / car_id UUID order.

alter table event_cars
  add column if not exists sort_order smallint not null default 0;

comment on column event_cars.sort_order is
  '0-based host add order; UI and Discord embed must not re-sort.';

-- Best-effort restore: last multi-row insert wrote rows in payload order (ctid).
update event_cars as ec
set sort_order = s.n
from (
  select
    event_id,
    car_id,
    (row_number() over (partition by event_id order by ctid) - 1)::smallint as n
  from event_cars
) as s
where ec.event_id = s.event_id
  and ec.car_id = s.car_id;
