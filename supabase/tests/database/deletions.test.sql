-- Who can delete a task.
begin;
create extension if not exists pgtap with schema extensions;
\ir _session.psql

select plan(5);

insert into public.tasks (title, assignee) values
  ('del: owned by 1', 'example1@example.com'),
  ('del: owned by 2', 'example2@example.com');

select pg_temp.act_as('example1@example.com');

prepare delete_other as
  delete from public.tasks where title = 'del: owned by 2' returning id;
select is_empty('delete_other',
  'a member cannot delete a task assigned to someone else');

prepare delete_own as
  delete from public.tasks where title = 'del: owned by 1' returning title;
select results_eq('delete_own',
  $$ values ('del: owned by 1'::text) $$,
  'a member can delete their own task');

select pg_temp.act_as_visitor();
prepare delete_as_visitor as
  delete from public.tasks returning id;
select is_empty('delete_as_visitor',
  'a visitor who is not signed in cannot delete anything');

select pg_temp.act_as_admin();
select is((select count(*) from public.tasks where title = 'del: owned by 1'), 0::bigint,
  'the deleted task is gone');
select is((select count(*) from public.tasks where title = 'del: owned by 2'), 1::bigint,
  'the other member''s task is still there');

select * from finish();
rollback;
