-- Optional time limit for a task, as HH:MM on the day in `due`.

alter table public.tasks add column due_time text
  check (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
