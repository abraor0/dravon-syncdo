-- Who can change a task.
begin;
create extension if not exists pgtap with schema extensions;
\ir _session.psql

select plan(8);

insert into public.tasks (title, description, assignee) values
  ('upd: owned by 1', 'original', 'example1@example.com'),
  ('upd: owned by 2', 'original', 'example2@example.com'),
  ('upd: handed over', 'original', 'example1@example.com');

-- The assignee
select pg_temp.act_as('example1@example.com');

prepare edit_own as
  update public.tasks set title = 'upd: owned by 1 (edited)', priority = 'high'
  where title = 'upd: owned by 1' returning title, priority;
select results_eq('edit_own',
  $$ values ('upd: owned by 1 (edited)'::text, 'high'::text) $$,
  'the assignee can edit their own task');

-- Another member
prepare edit_other as
  update public.tasks set title = 'upd: hijacked', description = 'changed by user 1'
  where title = 'upd: owned by 2' returning id;
select is_empty('edit_other',
  'a member cannot edit a task assigned to someone else');

-- Not signed in
select pg_temp.act_as_visitor();
prepare edit_as_visitor as
  update public.tasks set title = 'upd: hijacked' where title like 'upd: %' returning id;
select is_empty('edit_as_visitor',
  'a visitor who is not signed in cannot edit any task');

select pg_temp.act_as_admin();
select results_eq(
  $$ select title, description from public.tasks where assignee = 'example2@example.com' and title like 'upd: %' $$,
  $$ values ('upd: owned by 2'::text, 'original'::text) $$,
  'the other member''s task is left exactly as it was');

-- Handover: the assignee passes the task on, and the edit right moves with it
select pg_temp.act_as('example1@example.com');
prepare hand_over as
  update public.tasks set assignee = 'example2@example.com'
  where title = 'upd: handed over' returning assignee;
select results_eq('hand_over',
  $$ values ('example2@example.com'::text) $$,
  'the assignee can hand a task over to another member');

prepare edit_after_handover as
  update public.tasks set description = 'old owner edit' where title = 'upd: handed over' returning id;
select is_empty('edit_after_handover',
  'after the handover the previous assignee can no longer edit it');

select pg_temp.act_as('example2@example.com');
prepare edit_as_new_owner as
  update public.tasks set description = 'new owner edit' where title = 'upd: handed over' returning description;
select results_eq('edit_as_new_owner',
  $$ values ('new owner edit'::text) $$,
  'the new assignee can edit it');

prepare take_back as
  update public.tasks set assignee = 'example1@example.com' where title = 'upd: owned by 1 (edited)' returning id;
select is_empty('take_back',
  'a member cannot pull someone else''s task over to themselves');

select * from finish();
rollback;
