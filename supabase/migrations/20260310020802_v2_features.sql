-- Dravon SyncDo V2 Migration
-- Run this script in the Supabase SQL Editor to apply the new audit features.

-- Add audit trail columns
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE tasks ADD COLUMN completed_by TEXT NULL;

-- (Optional) Clean up old data that no longer makes sense
-- DELETE FROM tasks WHERE title = 'New Test Task';
