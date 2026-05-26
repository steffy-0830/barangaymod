-- Add user_name column to activity_logs table and create indexes
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_name ON activity_logs(user_name);
