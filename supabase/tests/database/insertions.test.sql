-- Who can create tasks, and in which state.
begin;
create extension if not exists pgtap with schema extensions;
\ir _session.psql

select plan(7);

select pg_temp.act_as('example1@example.com');

select lives_ok(
  $$ insert into public.tasks (title, assignee) values ('ins: my own task', 'example1@example.com') $$,
  'a member can create a task assigned to themselves');

select results_eq(
  $$ select status, priority from public.tasks where title = 'ins: my own task' $$,
  $$ values ('pending'::text, 'medium'::text) $$,
  'a new task starts pending with medium priority by default');

select throws_ok(
  $$ insert into public.tasks (title, assignee) values ('ins: for someone else', 'example2@example.com') $$,
  '42501', null,
  'a member cannot create a task assigned to another member');

select throws_ok(
  $$ insert into public.tasks (title, assignee, status, completed_at, completed_by)
     values ('ins: already done by me', 'example1@example.com', 'completed', now(), 'example1@example.com') $$,
  '23514', 'New tasks must start as pending',
  'a member cannot create a task that is already completed');

select throws_ok(
  $$ insert into public.tasks (title, assignee, status, completed_at, completed_by)
     values ('ins: done by someone else', 'example1@example.com', 'completed', now() - interval '9 days', 'example2@example.com') $$,
  '23514', 'New tasks must start as pending',
  'a member cannot create a completed task carrying someone else''s audit');

select pg_temp.act_as_visitor();

select throws_ok(
  $$ insert into public.tasks (title, assignee) values ('ins: anonymous', 'example1@example.com') $$,
  '42501', null,
  'a visitor who is not signed in cannot create tasks');

select pg_temp.act_as_admin();

select is(
  (select count(*) from public.tasks where title like 'ins: %'),
  1::bigint,
  'only the allowed insert was stored');

select * from finish();
rollback;
