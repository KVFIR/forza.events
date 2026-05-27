-- DNF/DNS rows have no finishing position; only classified finishers get 1..N.

update event_results
set position = null
where dnf or dns;

alter table event_results
  alter column position drop not null;

alter table event_results
  drop constraint if exists event_results_event_id_position_key;

create unique index if not exists event_results_event_finish_position_idx
  on event_results (event_id, position)
  where position is not null;

alter table event_results
  drop constraint if exists event_results_finish_position_check;

alter table event_results
  add constraint event_results_finish_position_check
  check (
    (
      not dnf
      and not dns
      and position is not null
      and position > 0
    )
    or (
      (dnf or dns)
      and not (dnf and dns)
      and position is null
    )
  );
