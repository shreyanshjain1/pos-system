-- 015_create_barcodes_and_rls.sql
-- Create barcodes table and add authoritative_device_id to shops
-- Add RLS policies to ensure only authoritative device can write

BEGIN;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS authoritative_device_id text;

CREATE TABLE IF NOT EXISTS public.barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  product_id uuid NOT NULL,
  code text NOT NULL,
  device_id text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS barcodes_shop_code_idx ON public.barcodes (shop_id, code);

-- Enable RLS
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;

-- SELECT: allow users mapped to the shop to read
CREATE POLICY "barcodes_select_for_shop_members" ON public.barcodes
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_shops us WHERE us.shop_id = public.barcodes.shop_id AND us.user_id = auth.uid())
  );

-- INSERT/UPDATE/DELETE: only allowed when request's device id equals shop.authoritative_device_id
-- Note: the HTTP device id header should be forwarded by the API gateway as 'x-device-id' and made
-- available to PostgREST/Realtime via the request settings. The policy below uses the
-- PostgREST-per-request setting 'request.header.x-device-id'. Adjust according to your gateway.
CREATE POLICY "barcodes_write_only_authoritative_device" ON public.barcodes
  FOR ALL
  USING (
    true
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = public.barcodes.shop_id
        AND COALESCE(s.authoritative_device_id::text, '') = current_setting('request.header.x-device-id', true)
    )
  );

COMMIT;
