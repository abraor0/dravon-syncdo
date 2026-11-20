-- Who can list the members (get_all_users, used by the column picker and the assignee menu).
begin;
create extension if not exists pgtap with schema extensions;
\ir _session.psql

select plan(5);

select pg_temp.act_as_visitor();
select throws_ok(
  $$ select * from public.get_all_users() $$,
  '42501', null,
  'a visitor who is not signed in cannot list members');

select pg_temp.act_as('example1@example.com');
select results_eq(
  $$ select email, name from public.get_all_users() $$,
  $$ values ('example1@example.com'::text, 'Example User 1'::text),
            ('example2@example.com'::text, 'Example User 2'::text) $$,
  'a signed-in member gets every member''s email and name, sorted by email');

select pg_temp.act_as('example2@example.com');
select is((select count(*) from public.get_all_users()), 2::bigint,
  'every member gets the same list');

-- The function itself refuses callers without a user id, even with the authenticated role
select pg_temp.act_as_admin();
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select set_config('role', 'authenticated', true);
select throws_ok(
  $$ select * from public.get_all_users() $$,
  'P0001', 'not authenticated',
  'a request without a signed-in user id is refused');

select pg_temp.act_as_admin();
select is(
  (select array_agg(privilege_type::text)
     from information_schema.role_routine_grants
    where routine_schema = 'public' and routine_name = 'get_all_users' and grantee = 'anon'),
  null,
  'the anon role has no grant on get_all_users');

select * from finish();
rollback;
