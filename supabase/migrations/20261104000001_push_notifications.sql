-- Task reminders sent to phones through Web Push by the send-reminders Edge Function.

-- One row per device. The endpoint identifies the device, so it belongs to whoever registered it last.
create table public.push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  -- Task times are local to the user, so the server needs the device's zone to know when they arrive.
  time_zone text not null check (char_length(time_zone) <= 64),
  updated_at timestamptz not null default clock_timestamp()
);
create index push_subscriptions_user_id on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "Own push subscriptions are readable" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "Own push subscriptions can be removed" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- Writes go through this function: it may have to take over a device from another account,
-- whose row the caller cannot see, so that account's reminders stop reaching this device.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_time_zone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, time_zone, updated_at)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, p_time_zone, clock_timestamp())
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        time_zone = excluded.time_zone, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- What each device has already received. Only the Edge Function uses it, with the service role.
create table public.reminders_sent (
  endpoint text not null references public.push_subscriptions (endpoint) on delete cascade,
  task_id text not null,
  kind text not null check (kind in ('soon', 'due')),
  due date not null,
  due_time text not null,
  sent_at timestamptz not null default clock_timestamp(),
  primary key (endpoint, task_id, kind, due, due_time)
);
alter table public.reminders_sent enable row level security;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The secret is created outside migrations, in Vault, and is also set as the function's CRON_SECRET.
select cron.schedule('send-task-reminders', '* * * * *', $$
  select net.http_post(
    url := 'https://njrxyodgnqxtkkdhqijx.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'syncro_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);

-- A job every minute would otherwise grow this history without limit.
select cron.schedule('clean-cron-history', '0 3 * * *', $$
  delete from cron.job_run_details where end_time < now() - interval '7 days';
$$);
