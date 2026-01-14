-- 011_create_user_notifications.sql
-- Simple notifications table for admin-triggered notices

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
