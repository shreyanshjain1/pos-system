-- 010_create_user_devices.sql
-- Create table to store registered devices per user

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_brand text NULL,
  user_agent text NULL,
  ip inet NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
