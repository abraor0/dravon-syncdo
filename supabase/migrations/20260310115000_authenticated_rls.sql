-- Allow authenticated users to insert tasks (fixes the 403 Forbidden)
-- The old policy only allowed anon (signed-out visitors), but the app now requires login.

create policy "Allow authenticated insert access"
  on tasks
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated select access"
  on tasks
  for select
  to authenticated
  using (true);

create policy "Allow authenticated update access"
  on tasks
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access"
  on tasks
  for delete
  to authenticated
  using (true);
