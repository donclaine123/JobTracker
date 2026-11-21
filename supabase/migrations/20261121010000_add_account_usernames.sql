begin;

create table public.account_usernames (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,23}$')
);

alter table public.account_usernames enable row level security;
revoke all on table public.account_usernames from public, anon, authenticated, service_role;
grant select, insert (username) on table public.account_usernames to authenticated;

create policy "Users can read their own username"
  on public.account_usernames for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can choose their own username"
  on public.account_usernames for insert to authenticated
  with check ((select auth.uid()) = user_id);

create function public.register_tracker_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen text := pg_catalog.lower(pg_catalog.btrim(new.raw_user_meta_data ->> 'username'));
begin
  if chosen is not null then
    insert into public.account_usernames (user_id, username) values (new.id, chosen);
  end if;
  return new;
end;
$$;

revoke all on function public.register_tracker_username() from public, anon, authenticated, service_role;

create trigger register_tracker_username
  after insert on auth.users
  for each row execute function public.register_tracker_username();

create function public.resolve_tracker_username(candidate text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select account.email::text
  from public.account_usernames as names
  join auth.users as account on account.id = names.user_id
  where names.username = pg_catalog.lower(pg_catalog.btrim(candidate));
$$;

revoke all on function public.resolve_tracker_username(text) from public, anon, authenticated, service_role;
grant execute on function public.resolve_tracker_username(text) to service_role;

commit;
