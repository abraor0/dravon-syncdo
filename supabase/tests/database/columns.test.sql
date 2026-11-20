-- Allowed values for status and priority. These rules apply to every writer, admins included.
begin;
create extension if not exists pgtap with schema extensions;
\ir _session.psql

select plan(12);

insert into public.tasks (title, assignee) values ('col: target', 'example1@example.com');

-- priority: low / medium / high only
select lives_ok($$ update public.tasks set priority = 'low'    where title = 'col: target' $$, 'priority accepts "low"');
select lives_ok($$ update public.tasks set priority = 'medium' where title = 'col: target' $$, 'priority accepts "medium"');
select lives_ok($$ update public.tasks set priority = 'high'   where title = 'col: target' $$, 'priority accepts "high"');
select throws_ok($$ update public.tasks set priority = 'urgent' where title = 'col: target' $$,
  '23514', null, 'priority rejects an unknown value');
select throws_ok($$ update public.tasks set priority = 'High' where title = 'col: target' $$,
  '23514', null, 'priority values are case-sensitive');
select throws_ok($$ insert into public.tasks (title, assignee, priority) values ('col: bad', 'example1@example.com', '') $$,
  '23514', null, 'priority rejects an empty string on insert');

-- status: pending / completed only
select lives_ok($$ update public.tasks set status = 'completed', completed_at = now(), completed_by = 'example1@example.com'
                   where title = 'col: target' $$, 'status accepts "completed"');
select lives_ok($$ update public.tasks set status = 'pending', completed_at = null, completed_by = null
                   where title = 'col: target' $$, 'status accepts "pending"');
select throws_ok($$ update public.tasks set status = 'done' where title = 'col: target' $$,
  '23514', null, 'status rejects an unknown value');
select throws_ok($$ insert into public.tasks (title, assignee, status) values ('col: bad', 'example1@example.com', 'in progress') $$,
  '23514', null, 'status rejects an unknown value on insert');

-- Completion data has to agree with the status
select throws_ok($$ update public.tasks set status = 'completed' where title = 'col: target' $$,
  '23514', null, 'a completed task needs completed_at and completed_by');

-- The same limits hold for members using the API
select pg_temp.act_as('example1@example.com');
select throws_ok($$ update public.tasks set priority = 'critical' where title = 'col: target' $$,
  '23514', null, 'a member cannot store an unknown priority either');

select * from finish();
rollback;
