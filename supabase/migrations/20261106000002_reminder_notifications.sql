-- The user's choice of notifications for tasks as well as reminders, read by the Windows app and by send-reminders.
alter table public.profiles add column notify_tasks boolean not null default true;

-- Reminders use reminders_sent too, with their task_id written as 'reminder:<id>' and `due` and `due_time` set to the occurrence.
alter table public.reminders_sent drop constraint reminders_sent_kind_check;
alter table public.reminders_sent add constraint reminders_sent_kind_check check (kind in ('soon', 'due', '1w', '1d', '1h', '10m', 'at'));
