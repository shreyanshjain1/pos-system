-- Replace the existing create_sale RPC with this fully-qualified, defensive implementation.
-- Run this in your Supabase SQL editor (or psql) to update the function.

-- Drop the existing function first (Postgres won't change return type with CREATE OR REPLACE)
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
  v_stock int;
  v_product_name text;
BEGIN
  -- Basic validation
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array';
  END IF;

  -- Create sale record (attach shop_id when provided)
  INSERT INTO public.sales (total, payment_method, created_at, user_id, shop_id)
  VALUES (p_total, p_payment_method, now(), p_user_id, p_shop_id)
  RETURNING id INTO v_sale_id;

  -- For each item: lock the product row, validate stock, insert sale_item, and decrement stock.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    v_price := COALESCE((v_item->>'price')::numeric, 0);

    -- Lock product row to prevent concurrent modifications
    SELECT p.stock, p.name INTO v_stock, v_product_name
    FROM public.products p
    WHERE p.id = v_product_id
    FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;

    IF v_qty < 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %: %', v_product_id, v_qty;
    END IF;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product % (% available, % requested)', v_product_id, v_stock, v_qty;
    END IF;

    -- Insert sale item with explicit column names, include shop_id for explicit tenant linkage
    INSERT INTO public.sale_items (sale_id, product_id, quantity, price, shop_id)
    VALUES (v_sale_id, v_product_id, v_qty, v_price, p_shop_id);

    -- Decrement product stock
    UPDATE public.products
    SET stock = v_stock - v_qty
    WHERE id = v_product_id;
  END LOOP;

  -- Return sale + items as JSON, include product names by joining products
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

-- Notes:
-- 1) This function locks product rows with `FOR UPDATE` to prevent concurrent stock races.
-- 2) It validates stock and raises a clear exception if stock is insufficient.
-- 3) Use the service-role key or a server-side Supabase admin client to call this RPC when RLS is enabled.
