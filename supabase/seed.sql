-- Local development seed (applied by `supabase start` / `supabase db reset`).
-- Every value below is fake and exists only for local testing.
--
-- Users (password for both: password123)
--   example1@example.com  "Example User 1"
--   example2@example.com  "Example User 2"

-- Already present on every Supabase stack; kept so the seed never depends on it.
create extension if not exists pgcrypto with schema extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'example1@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{"name":"Example User 1"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'example2@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{"name":"Example User 2"}',
    now(), now(), '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email in ('example1@example.com', 'example2@example.com');

-- Mock tasks, so ownership rules and metric filters can be checked right away.
insert into public.tasks (title, description, status, priority, assignee, created_at, completed_at, completed_by)
values
  ('[MOCK] Example task 1', 'Mock data: pending, high priority', 'pending', 'high', 'example1@example.com', now() - interval '2 days', null, null),
  ('[MOCK] Example task 2', 'Mock data: pending, low priority', 'pending', 'low', 'example1@example.com', now() - interval '1 day', null, null),
  ('[MOCK] Example task 3', 'Mock data: completed today', 'completed', 'medium', 'example1@example.com', now() - interval '3 days', now(), 'example1@example.com'),
  ('[MOCK] Example task 4', 'Mock data: pending, medium priority', 'pending', 'medium', 'example2@example.com', now() - interval '1 day', null, null),
  ('[MOCK] Example task 5', 'Mock data: completed 35 days ago', 'completed', 'high', 'example2@example.com', now() - interval '40 days', now() - interval '35 days', 'example2@example.com');
