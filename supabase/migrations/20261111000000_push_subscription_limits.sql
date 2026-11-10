-- Limits on what a device can register: only the known push services, a plain time zone name,
-- and at most 10 devices per account (the oldest are dropped). Same hosts as isPushEndpoint in
-- supabase/functions/send-reminders/rules.ts. Errors use class 22 so the client sees a rejection.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_time_zone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_endpoint is null or p_endpoint !~* '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)/' then
    raise exception 'invalid push endpoint' using errcode = '22023';
  end if;
  if p_time_zone is null or p_time_zone !~ '^[A-Za-z0-9_+/-]{1,64}$' then
    raise exception 'invalid time zone' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, time_zone, updated_at)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, p_time_zone, clock_timestamp())
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        time_zone = excluded.time_zone, updated_at = excluded.updated_at;
  delete from public.push_subscriptions
  where endpoint in (
    select endpoint from public.push_subscriptions
    where user_id = auth.uid()
    order by updated_at desc, endpoint
    offset 10
  );
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
