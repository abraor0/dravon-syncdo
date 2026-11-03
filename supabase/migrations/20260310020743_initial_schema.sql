-- Create a table for tasks
create table 
  tasks (
    id bigint primary key generated always as identity,
    title text not null,
    description text,
    status text not null default 'pending'::text,
    priority text not null default 'medium'::text,
    assignee text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

-- Set up Row Level Security (RLS)
alter table tasks enable row level security;

-- Create policies for anonymous access (MVP phase only)
create policy "Allow anonymous read access"
  on tasks
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access"
  on tasks
  for insert
  to anon
  with check (true);

create policy "Allow anonymous update access"
  on tasks
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous delete access"
  on tasks
  for delete
  to anon
  using (true);

-- Enable real-time for the tasks table
alter publication supabase_realtime add table tasks;
