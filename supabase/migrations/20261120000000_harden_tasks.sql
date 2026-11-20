-- Dravon SyncDo: harden the tasks table.
--
-- RLS decides WHO may write a row, but until now nothing decided WHAT may be written:
--   * status / priority accepted any text, which silently breaks metrics and filters;
--   * completed_at / completed_by were whatever the client sent, so the completion audit
--     could be forged (backdated, or attributed to someone else);
--   * a task could be created already completed, with someone else's audit;
--   * created_at could be rewritten, and a task could be handed to an address that is not
--     a member (after which nobody can edit or delete it).
--
-- Approach: the server owns every automatic field. For signed-in members the trigger below
-- derives created_at, completed_at and completed_by itself and ignores what the client sent.
-- The service role and direct database access (migrations, seed, support fixes) are not
-- affected, so data can still be corrected by an administrator.

-- ---------------------------------------------------------------------------
-- Allowed values
-- ---------------------------------------------------------------------------
-- NOT VALID: enforced for every new or changed row from now on, without rewriting or
-- rejecting rows that already exist. Once old data is cleaned up, run
--   ALTER TABLE public.tasks VALIDATE CONSTRAINT <name>;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_valid
    CHECK (status IN ('pending', 'completed')) NOT VALID,
  ADD CONSTRAINT tasks_priority_valid
    CHECK (priority IN ('low', 'medium', 'high')) NOT VALID,
  ADD CONSTRAINT tasks_completion_matches_status
    CHECK (
      (status = 'completed' AND completed_at IS NOT NULL AND completed_by IS NOT NULL)
      OR (status <> 'completed' AND completed_at IS NULL AND completed_by IS NULL)
    ) NOT VALID;

-- timezone('utc', now()) yields a timestamp WITHOUT time zone, which is then read back in
-- the session's time zone. now() is already an absolute point in time.
ALTER TABLE public.tasks ALTER COLUMN created_at SET DEFAULT now();

-- ---------------------------------------------------------------------------
-- Server-owned fields for members' writes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tasks_apply_server_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- needs to read auth.users to check the new assignee
SET search_path = ''
AS $$
DECLARE
  member_email text := auth.jwt() ->> 'email';
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A task always starts open. Completing it is a separate, audited step.
    IF NEW.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'New tasks must start as pending'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.created_at   := now();
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  ELSE
    -- created_at never changes after the row exists.
    NEW.created_at := OLD.created_at;

    -- The completion audit follows the status transition, never the client's values.
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at := now();
      NEW.completed_by := member_email;
    ELSIF NEW.status = 'completed' THEN
      NEW.completed_at := OLD.completed_at;
      NEW.completed_by := OLD.completed_by;
    ELSE
      NEW.completed_at := NULL;
      NEW.completed_by := NULL;
    END IF;

    -- A task can only be handed to someone who can actually sign in and own it.
    IF NEW.assignee IS DISTINCT FROM OLD.assignee
       AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = NEW.assignee) THEN
      RAISE EXCEPTION 'Tasks can only be assigned to an existing member'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tasks_apply_server_fields() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tasks_apply_server_fields
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_apply_server_fields();
