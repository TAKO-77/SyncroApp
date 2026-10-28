-- Several notes per workspace. Existing workspace notes move into this table with
-- the id 'n-<workspace id>', the same id the app uses when it migrates its local copy.

create table public.workspace_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  workspace_id text not null,
  text text not null default '' check (char_length(text) <= 5000),
  position integer not null default 0,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create trigger workspace_notes_touch before insert or update on public.workspace_notes for each row execute function public.touch_updated_at();
alter table public.workspace_notes enable row level security;
create policy workspace_notes_owner on public.workspace_notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index workspace_notes_changes on public.workspace_notes (user_id, updated_at);

insert into public.workspace_notes (user_id, id, workspace_id, text)
select user_id, 'n-' || id, id, notes from public.workspaces where notes <> '' and not deleted
on conflict (user_id, id) do nothing;

update public.workspaces set notes = '' where notes <> '';
