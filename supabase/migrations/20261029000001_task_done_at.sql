-- Day a task was completed; completed tasks are removed by the app two days later.
-- Tasks already completed count from today so nothing disappears immediately.

alter table public.tasks add column done_at date;
update public.tasks set done_at = current_date where done and done_at is null;
