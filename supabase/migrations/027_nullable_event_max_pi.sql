-- Open-build events may omit a PI cap (anything_goes without max_pi).
alter table events
  alter column max_pi drop default,
  alter column max_pi drop not null;
