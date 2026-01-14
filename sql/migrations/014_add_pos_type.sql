-- Add plan and pos_type columns to shops table (idempotent)
BEGIN;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basic';

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS pos_type text NOT NULL DEFAULT '';

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS pos_type_selected_at timestamptz NULL;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMIT;
