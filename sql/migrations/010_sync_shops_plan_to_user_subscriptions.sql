-- 010_sync_shops_plan_to_user_subscriptions.sql
-- Move `pos_type` (and any existing `plan` values) from `shops` into
-- `user_subscriptions`. Remove `plan`/`pos_type` from `shops`.

BEGIN;

-- Ensure there is a unique index on user_subscriptions.user_id for safe upserts
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_unique_idx
  ON user_subscriptions (user_id);

-- 1) Add `pos_type` to `user_subscriptions` if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user_subscriptions' AND column_name='pos_type'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN pos_type text;
  END IF;
END$$;

-- 2) Migrate existing data from shops -> user_subscriptions for shop owners
--    If a subscription exists, update its `plan` and `pos_type` where applicable.
-- Only migrate owners that exist in the auth.users table to satisfy the FK
INSERT INTO user_subscriptions (user_id, plan, pos_type, expiry_date, created_at, updated_at)
SELECT s.owner_user_id, s.plan, s.pos_type, '2999-12-31T00:00:00Z'::timestamptz, now(), now()
FROM shops s
WHERE s.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.owner_user_id)
ON CONFLICT (user_id) DO UPDATE
  SET plan = COALESCE(EXCLUDED.plan, user_subscriptions.plan),
      pos_type = COALESCE(EXCLUDED.pos_type, user_subscriptions.pos_type),
      updated_at = now();

-- 3) Clean up: remove any triggers/functions that synced shop.plan previously
DROP TRIGGER IF EXISTS trg_sync_shop_plan_on_shops ON shops;
DROP FUNCTION IF EXISTS sync_shop_plan_to_owner();

-- 4) Remove `plan` and `pos_type` from shops (if present)
ALTER TABLE shops
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS pos_type;

COMMIT;
