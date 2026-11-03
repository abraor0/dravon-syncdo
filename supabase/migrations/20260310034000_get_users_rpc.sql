-- Dravon SyncDo: Secure RPC to list all users
-- This allows the frontend to fetch the list of dynamic users for assignment dropdowns securely,
-- without needing a service role key or full access to auth.users.

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE(email TEXT, name TEXT)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    u.email::text, 
    (u.raw_user_meta_data->>'name')::text 
  FROM auth.users u;
END;
$$ LANGUAGE plpgsql;
