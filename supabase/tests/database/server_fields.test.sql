-- Fields the server owns: completed_at, completed_by and created_at can't be forged through
-- the API, and a task can only be handed to an existing member.
--
-- now() is fixed for the whole transaction, so "set by the server" means "equals now()".
begin;
create extension if not exists pgtap with schema extensions;
\ir _session.psql

select plan(13);

insert into public.tasks (title, assignee, created_at) values
  ('srv: to complete', 'example1@example.com', now() - interval '10 days'),
  ('srv: to reassign', 'example1@example.com', now() - interval '10 days');

select pg_temp.act_as('example1@example.com');

-- Completing: whatever the client sends, the server stamps the time and the member
update public.tasks
   set status = 'completed', completed_at = '2000-01-01T00:00:00Z', completed_by = 'example2@example.com'
 where title = 'srv: to complete';

select results_eq(
  $$ select completed_at, completed_by from public.tasks where title = 'srv: to complete' $$,
  $$ values (now(), 'example1@example.com'::text) $$,
  'completing a task records the server time and the member who did it, not the values sent');

-- Later edits keep the original completion record
update public.tasks
   set title = 'srv: completed (renamed)', completed_at = now() - interval '300 days', completed_by = 'example2@example.com'
 where title = 'srv: to complete';

select results_eq(
  $$ select completed_at, completed_by from public.tasks where title = 'srv: completed (renamed)' $$,
  $$ values (now(), 'example1@example.com'::text) $$,
  'editing a completed task cannot rewrite who completed it or when');

-- Reopening clears the record
update public.tasks set status = 'pending' where title = 'srv: completed (renamed)';
select results_eq(
  $$ select completed_at, completed_by from public.tasks where title = 'srv: completed (renamed)' $$,
  $$ values (null::timestamptz, null::text) $$,
  'reopening a task clears its completion record');

-- An open task cannot carry a completion record
update public.tasks
   set completed_at = now(), completed_by = 'example2@example.com'
 where title = 'srv: completed (renamed)';
select results_eq(
  $$ select status, completed_at, completed_by from public.tasks where title = 'srv: completed (renamed)' $$,
  $$ values ('pending'::text, null::timestamptz, null::text) $$,
  'completion fields sent for an open task are ignored');

-- Creating: completion fields sent with a pending task are dropped, created_at is the server's
insert into public.tasks (title, assignee, created_at, completed_at, completed_by)
values ('srv: created', 'example1@example.com', '2000-01-01T00:00:00Z', now(), 'example2@example.com');
select results_eq(
  $$ select created_at, completed_at, completed_by from public.tasks where title = 'srv: created' $$,
  $$ values (now(), null::timestamptz, null::text) $$,
  'a new task gets the server time as created_at and no completion record');

-- created_at never changes
update public.tasks set created_at = '2000-01-01T00:00:00Z' where title = 'srv: to reassign';
select is(
  (select created_at from public.tasks where title = 'srv: to reassign'),
  (select now() - interval '10 days'),
  'created_at cannot be rewritten');

-- Handover only to real members
select throws_ok(
  $$ update public.tasks set assignee = 'nobody@example.com' where title = 'srv: to reassign' $$,
  '23503', 'Tasks can only be assigned to an existing member',
  'a task cannot be handed to an address that is not a member');
select throws_ok(
  $$ update public.tasks set assignee = 'EXAMPLE2@example.com' where title = 'srv: to reassign' $$,
  '23503', null,
  'the member check uses the exact stored email');

-- A completed task handed over keeps its original record
update public.tasks set status = 'completed' where title = 'srv: to reassign';
update public.tasks set assignee = 'example2@example.com' where title = 'srv: to reassign';
select pg_temp.act_as('example2@example.com');
update public.tasks set description = 'edited by the new owner' where title = 'srv: to reassign';
select results_eq(
  $$ select assignee, completed_by from public.tasks where title = 'srv: to reassign' $$,
  $$ values ('example2@example.com'::text, 'example1@example.com'::text) $$,
  'a completed task keeps its completion record across a handover and later edits');

-- The new owner reopens and completes it again: the record now names them
update public.tasks set status = 'pending' where title = 'srv: to reassign';
update public.tasks set status = 'completed', completed_by = 'example1@example.com' where title = 'srv: to reassign';
select is(
  (select completed_by from public.tasks where title = 'srv: to reassign'),
  'example2@example.com',
  'completing again records the member who completed it this time');

-- Direct database access (support fixes, the seed) is not restricted
select pg_temp.act_as_admin();
update public.tasks
   set completed_at = '2026-01-15T12:00:00Z', completed_by = 'example2@example.com'
 where title = 'srv: to reassign';
select is(
  (select completed_at from public.tasks where title = 'srv: to reassign'),
  '2026-01-15T12:00:00Z'::timestamptz,
  'an administrator can still correct a completion time');

select has_trigger('public', 'tasks', 'tasks_apply_server_fields',
  'the trigger enforcing server-owned fields is installed');
select is(
  (select prosecdef and proconfig @> array['search_path=""']
     from pg_proc where proname = 'tasks_apply_server_fields'),
  true,
  'the trigger function runs as its owner with an empty search_path');

select * from finish();
rollback;
