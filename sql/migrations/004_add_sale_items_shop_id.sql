-- 004_add_sale_items_shop_id.sql
-- Add shop_id to sale_items to explicitly associate items with a shop

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='shop_id'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN shop_id uuid REFERENCES shops(id);

    -- Backfill existing sale_items from parent sales
    UPDATE sale_items si
    SET shop_id = s.shop_id
    FROM sales s
    WHERE si.sale_id = s.id AND si.shop_id IS NULL;
  END IF;
END$$;

-- Consider enabling RLS and creating policies to enforce membership checks for sale_items as needed.
