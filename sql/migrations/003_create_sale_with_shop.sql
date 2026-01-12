-- 003_create_sale_with_shop.sql
-- Replace create_sale RPC to include shop scoping (p_shop_id)
DROP FUNCTION IF EXISTS public.create_sale(numeric, text, jsonb, uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_sale(
  p_total numeric,
  p_payment_method text,
  p_items jsonb,
  p_user_id uuid DEFAULT NULL,
  p_shop_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_price numeric;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array';
  END IF;

  INSERT INTO public.sales (total, payment_method, created_at, user_id, shop_id)
  VALUES (p_total, p_payment_method, now(), p_user_id, p_shop_id)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    v_price := COALESCE((v_item->>'price')::numeric, 0);

    INSERT INTO public.sale_items (sale_id, product_id, quantity, price)
    VALUES (v_sale_id, v_product_id, v_qty, v_price);

    UPDATE public.products
    SET stock = public.products.stock - v_qty
    WHERE public.products.id = v_product_id;
  END LOOP;

  RETURN (
    SELECT jsonb_build_object(
      'sale', to_jsonb(s.*),
      'items', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', si.id,
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'price', si.price
        ) ORDER BY si.id)
        FROM public.sale_items si
        LEFT JOIN public.products p ON p.id = si.product_id
        WHERE si.sale_id = s.id
      )
    )
    FROM public.sales s
    WHERE s.id = v_sale_id
  );
END;
$$;

-- Notes: backfill and RLS considerations remain same as prior migration.
