-- Dravon SyncDo: fix RLS and switch task ownership from display names to emails.
--
-- 1. Earlier migrations left permissive policies (anon + authenticated, `using (true)`)
--    in place. Permissive policies are OR'ed, so the owner-only rules never took effect.
--    We drop every known policy and recreate a single, strict set.
-- 2. `assignee` / `completed_by` held display names while the policies compare against
--    the JWT email. Existing rows are backfilled to the owner's email.
-- 3. `get_all_users` was callable by anonymous visitors and had no fixed search_path.

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access" ON tasks;
DROP POLICY IF EXISTS "Allow anonymous insert access" ON tasks;
DROP POLICY IF EXISTS "Allow anonymous update access" ON tasks;
DROP POLICY IF EXISTS "Allow anonymous delete access" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated select access" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated update access" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Enable update for task assignee" ON tasks;
DROP POLICY IF EXISTS "Enable delete for task assignee" ON tasks;

-- Any signed-in member can see every task (needed for the 'Company View' board).
CREATE POLICY "tasks_select_authenticated" ON tasks
    FOR SELECT TO authenticated
    USING (true);

-- Members can only create tasks assigned to themselves.
CREATE POLICY "tasks_insert_own" ON tasks
    FOR INSERT TO authenticated
    WITH CHECK ((auth.jwt() ->> 'email') = assignee);

-- Only the current assignee can edit a task. The new row may name another member,
-- which is how a task is handed over.
CREATE POLICY "tasks_update_own" ON tasks
    FOR UPDATE TO authenticated
    USING ((auth.jwt() ->> 'email') = assignee)
    WITH CHECK (true);

-- Only the assignee can delete a task.
CREATE POLICY "tasks_delete_own" ON tasks
    FOR DELETE TO authenticated
    USING ((auth.jwt() ->> 'email') = assignee);

-- ---------------------------------------------------------------------------
-- Backfill: display name -> email
-- ---------------------------------------------------------------------------
-- A row is only rewritten when its value maps to exactly one user, so ambiguous
-- names are left untouched for manual review.
WITH aliases AS (
  SELECT u.email::text AS email, a.alias
  FROM auth.users u
  CROSS JOIN LATERAL (
    VALUES
      (u.raw_user_meta_data->>'name'),
      (u.raw_user_meta_data->>'full_name'),
      (split_part(u.email::text, '@', 1))
  ) AS a(alias)
  WHERE a.alias IS NOT NULL AND a.alias <> ''
),
unique_aliases AS (
  SELECT alias, min(email) AS email
  FROM aliases
  GROUP BY alias
  HAVING count(DISTINCT email) = 1
)
UPDATE tasks t
SET assignee = ua.email
FROM unique_aliases ua
WHERE t.assignee = ua.alias;

WITH aliases AS (
  SELECT u.email::text AS email, a.alias
  FROM auth.users u
  CROSS JOIN LATERAL (
    VALUES
      (u.raw_user_meta_data->>'name'),
      (u.raw_user_meta_data->>'full_name'),
      (split_part(u.email::text, '@', 1))
  ) AS a(alias)
  WHERE a.alias IS NOT NULL AND a.alias <> ''
),
unique_aliases AS (
  SELECT alias, min(email) AS email
  FROM aliases
  GROUP BY alias
  HAVING count(DISTINCT email) = 1
)
UPDATE tasks t
SET completed_by = ua.email
FROM unique_aliases ua
WHERE t.completed_by = ua.alias;

-- ---------------------------------------------------------------------------
-- get_all_users: authenticated callers only, pinned search_path
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(email TEXT, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name')::text
  FROM auth.users u
  ORDER BY u.email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_all_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
