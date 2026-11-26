-- Per-account row limits, so one account cannot fill the database. Checked only when a row is new:
-- an upsert of an existing row (the usual sync write) passes straight through. Two caps per table:
-- rows in use (not deleted), and all rows, because soft-deleted rows stay for the other devices.
-- Errors use class 23 so the client drops the change into its rejected log instead of retrying.
create or replace function public.enforce_row_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  live_max integer := tg_argv[0]::integer;
  total_max integer := tg_argv[1]::integer;
  found boolean;
  n integer;
begin
  execute format('select exists (select 1 from %I.%I where user_id = $1 and id = $2)', tg_table_schema, tg_table_name)
    into found using new.user_id, new.id;
  if found then
    return new;
  end if;
  execute format('select count(*) from (select 1 from %I.%I where user_id = $1 limit $2) s', tg_table_schema, tg_table_name)
    into n using new.user_id, total_max;
  if n >= total_max then
    raise exception 'row limit reached for %', tg_table_name using errcode = '23514';
  end if;
  if not new.deleted then
    execute format('select count(*) from (select 1 from %I.%I where user_id = $1 and not deleted limit $2) s', tg_table_schema, tg_table_name)
      into n using new.user_id, live_max;
    if n >= live_max then
      raise exception 'row limit reached for %', tg_table_name using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_row_limit() from public, anon, authenticated;

create trigger row_limit before insert on public.tasks for each row execute function public.enforce_row_limit('5000', '50000');
create trigger row_limit before insert on public.events for each row execute function public.enforce_row_limit('5000', '50000');
create trigger row_limit before insert on public.finances for each row execute function public.enforce_row_limit('20000', '50000');
create trigger row_limit before insert on public.special_days for each row execute function public.enforce_row_limit('5000', '50000');
create trigger row_limit before insert on public.reminders for each row execute function public.enforce_row_limit('2000', '50000');
create trigger row_limit before insert on public.workspace_notes for each row execute function public.enforce_row_limit('500', '5000');
create trigger row_limit before insert on public.workspaces for each row execute function public.enforce_row_limit('200', '2000');
create trigger row_limit before insert on public.event_categories for each row execute function public.enforce_row_limit('200', '2000');
create trigger row_limit before insert on public.day_categories for each row execute function public.enforce_row_limit('200', '2000');
