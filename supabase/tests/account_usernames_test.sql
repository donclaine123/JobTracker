begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

set local role supabase_auth_admin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000011', 'username-owner@example.test', '{"username":" MiXeD_User "}'),
  ('00000000-0000-4000-8000-000000000012', 'username-legacy@example.test', '{}');
reset role;

select is((select username from account_usernames where user_id = '00000000-0000-4000-8000-000000000011'),
  'mixed_user', 'Signup claims the normalized username');
select is((select count(*) from account_usernames where user_id = '00000000-0000-4000-8000-000000000012'),
  0::bigint, 'An email-only account can exist without a username');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values
    ('00000000-0000-4000-8000-000000000013', 'username-duplicate@example.test', '{"username":"MIXED_USER"}')$$,
  '23505', null, 'Signup rejects a duplicate username regardless of case'
);
select is((select count(*) from auth.users where id = '00000000-0000-4000-8000-000000000013'),
  0::bigint, 'A rejected signup leaves no partial account');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000012"}';

select is((select count(*) from account_usernames where username = 'mixed_user'),
  0::bigint, 'An authenticated user cannot read another account’s username mapping');
select lives_ok($$insert into account_usernames (username) values ('legacy_user')$$,
  'An existing account can claim its own username');
select throws_ok($$insert into account_usernames (user_id, username) values
  ('00000000-0000-4000-8000-000000000011', 'other_user')$$,
  '42501', null, 'A user cannot choose the account that owns a username');
select throws_ok($$select resolve_tracker_username('mixed_user')$$,
  '42501', null, 'A signed-in client cannot look up another user’s email');

reset role;
set local role anon;
select throws_ok($$select resolve_tracker_username('mixed_user')$$,
  '42501', null, 'The publishable key cannot resolve usernames to emails');

reset role;
set local role service_role;
select is(resolve_tracker_username(' MiXeD_USER '), 'username-owner@example.test',
  'The server can resolve a username case-insensitively');
select is(resolve_tracker_username('missing_user'), null::text, 'Unknown usernames return no email');

select * from finish();
rollback;
