-- Reminders are separate from tasks: a title, a day and a time, with an optional early warning
-- or a daily or weekly repetition up to a final day. `done_until` is the last occurrence concluded
-- ('YYYY-MM-DDTHH:MM', local time) and `done_at` the day the last one was concluded.

create table public.reminders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 90),
  date date not null,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  frequency text not null default 'none' check (frequency in ('none', 'daily', 'weekly')),
  lead_time text not null default '' check (lead_time in ('', '1w', '1d', '1h', '10m')),
  end_date date,
  done_until text not null default '' check (done_until = '' or done_until ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$'),
  done_at date,
  position integer not null default 0,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id),
  check (frequency = 'none' or (end_date is not null and end_date >= date))
);

create trigger reminders_touch before insert or update on public.reminders for each row execute function public.touch_updated_at();
alter table public.reminders enable row level security;
create policy reminders_owner on public.reminders for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index reminders_changes on public.reminders (user_id, updated_at);
