-- Allow the same catalog car more than once on an event (alternative builds:
-- different tune share code / PI / restrictions on separate rows).

alter table event_cars
  add column if not exists id uuid not null default gen_random_uuid();

alter table event_cars drop constraint if exists event_cars_pkey;

alter table event_cars
  add primary key (id);

create index if not exists event_cars_event_id_sort_order_idx
  on event_cars (event_id, sort_order);

comment on column event_cars.id is
  'Surrogate PK so the same cars.id can appear more than once (alternative builds).';
