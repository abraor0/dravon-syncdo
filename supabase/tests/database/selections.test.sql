-- Who can read tasks.
begin;
create extension if not exists pgtap with schema extensions;
\ir _session.psql

select plan(5);

-- Reference counts, taken with direct database access (no RLS).
select count(*) as all_tasks,
       count(*) filter (where assignee = 'example2@example.com') as user2_tasks
from public.tasks \gset

select ok(:all_tasks > 0, 'the seed provides tasks to read');

select pg_temp.act_as_visitor();
select is((select count(*) from public.tasks), 0::bigint,
  'a visitor who is not signed in sees no tasks');

select pg_temp.act_as('example1@example.com');
select is((select count(*) from public.tasks), :all_tasks::bigint,
  'a signed-in member sees every task');
select is((select count(*) from public.tasks where assignee = 'example2@example.com'), :user2_tasks::bigint,
  'that includes tasks assigned to other members (Company View)');

select pg_temp.act_as('example2@example.com');
select is((select count(*) from public.tasks), :all_tasks::bigint,
  'every member sees the same full list');

select * from finish();
rollback;
