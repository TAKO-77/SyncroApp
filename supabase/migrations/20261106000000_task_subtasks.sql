-- A subtask is a normal task that points to its main task. There is no foreign key: ids are generated
-- by the client, rows are soft-deleted and a subtask can arrive before its parent. The row level
-- security of `tasks` already covers these rows. Existing tasks stay main tasks.

alter table public.tasks add column parent_id text
  check (parent_id is null or parent_id <> id);

-- Same value as TASK_NOTES_MAX in codigo-fonte/src/lib/taskNotes.ts.
alter table public.tasks drop constraint tasks_notes_check;
alter table public.tasks add constraint tasks_notes_check check (char_length(notes) <= 10000);
