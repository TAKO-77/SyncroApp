-- rls_auto_enable() is the event trigger function that turns on RLS for new
-- tables. Event triggers don't need EXECUTE, so nobody should be able to call
-- it through /rest/v1/rpc.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
