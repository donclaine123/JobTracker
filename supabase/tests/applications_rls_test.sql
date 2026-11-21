begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'job-tracker-owner@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'job-tracker-other@example.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001"}';

select lives_ok(
  $$insert into applications (company, role) values ('Example Co', 'Recruiter')$$,
  'An authenticated user can create an application with default ownership'
);
select is((select status from applications where company = 'Example Co'), 'saved', 'The owner can read their application and its default status');
select throws_ok(
  $$insert into applications (company, role, user_id) values ('Example Co', 'Recruiter', '00000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'A user cannot create an application for someone else'
);
select throws_ok(
  $$update applications set user_id = '00000000-0000-4000-8000-000000000002' where company = 'Example Co'$$,
  '42501', null, 'An owner cannot transfer an application to someone else'
);

with updated as (
  update applications set status = 'applied' where company = 'Example Co' returning status
)
select is((select status from updated), 'applied', 'The owner can update their application');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002"}';

select is((select count(*) from applications where company = 'Example Co'), 0::bigint, 'Another user cannot see the application');
with updated as (
  update applications set status = 'rejected' where company = 'Example Co' returning id
)
select is((select count(*) from updated), 0::bigint, 'Another user cannot update the application');
with deleted as (
  delete from applications where company = 'Example Co' returning id
)
select is((select count(*) from deleted), 0::bigint, 'Another user cannot delete the application');

reset role;
set local role anon;
set local request.jwt.claims = '{}';

select throws_ok($$select * from applications$$, '42501', null, 'Signed-out visitors cannot read applications');
select throws_ok($$insert into applications (company, role) values ('Example Co', 'Recruiter')$$, '42501', null, 'Signed-out visitors cannot create applications');
select ok(
  not has_table_privilege('anon', 'applications', 'update') and not has_table_privilege('anon', 'applications', 'delete'),
  'Signed-out visitors have no update or delete privileges'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001"}';

with deleted as (
  delete from applications where company = 'Example Co' returning id
)
select is((select count(*) from deleted), 1::bigint, 'The owner can delete their application');

select * from finish();

rollback;
