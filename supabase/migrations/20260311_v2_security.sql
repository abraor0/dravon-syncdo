-- Migration: Enable Row Level Security (RLS) and define ownership rules for tasks

-- Ensure RLS is enabled on the tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Clean up any potential existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Enable update for task assignee" ON tasks;
DROP POLICY IF EXISTS "Enable delete for task assignee" ON tasks;

-- 1. SELECT Policy
-- Everyone can view all tasks to support the 'Company View' Kanban view
CREATE POLICY "Enable read access for all users" ON tasks
    FOR SELECT USING (true);

-- 2. INSERT Policy
-- Any authenticated user can insert a task
CREATE POLICY "Enable insert for authenticated users" ON tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. UPDATE Policy
-- Only the assignee of the task can modify its data (title, desc, status, etc)
CREATE POLICY "Enable update for task assignee" ON tasks
    FOR UPDATE USING (
      (auth.jwt() ->> 'email') = assignee
    ) WITH CHECK (
      (auth.jwt() ->> 'email') = assignee
    );

-- 4. DELETE Policy
-- Only the assignee can delete the task entirely
CREATE POLICY "Enable delete for task assignee" ON tasks
    FOR DELETE USING (
      (auth.jwt() ->> 'email') = assignee
    );
