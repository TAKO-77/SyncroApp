-- Optional end time for a special day, as HH:MM; `time` remains the start.

alter table public.special_days add column end_time text not null default ''
  check (end_time = '' or end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
