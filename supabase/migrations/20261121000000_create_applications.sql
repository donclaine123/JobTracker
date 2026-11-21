begin;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null check (company ~ '[^[:space:]]'),
  role text not null check (role ~ '[^[:space:]]'),
  location text,
  work_setup text check (work_setup in ('remote', 'onsite', 'hybrid')),
  employment_type text,
  -- Postings can list ranges, different currencies, or allowances in the same field.
  monthly_pay text,
  experience text,
  status text not null default 'saved'
    check (status in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  posting_url text check (posting_url ~* '^https?://[^[:space:]/?#]+[^[:space:]]*$'),
  source text,
  applied_on date,
  follow_up_on date,
  notes text,
  created_at timestamptz not null default now()
);

create index applications_user_id_idx on public.applications (user_id);

alter table public.applications enable row level security;

revoke all on table public.applications from public, anon, authenticated;
grant select, insert, update, delete on table public.applications to authenticated;

create policy "Users can manage their own applications"
  on public.applications
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
