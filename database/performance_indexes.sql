-- Safe performance indexes for common queries in TRATO
-- Idempotent: uses IF NOT EXISTS where supported

-- 1) products listing and seller filtering
CREATE INDEX IF NOT EXISTS idx_products_is_public_created_at ON public.products (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_seller_public ON public.products (seller_id, is_public);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock_quantity);

-- Optional trigram index for ILIKE search (enable extension if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    CREATE EXTENSION pg_trgm;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING gin (description gin_trgm_ops);

-- 2) daily_products filtered by time window and stock
CREATE INDEX IF NOT EXISTS idx_daily_products_expires_stock ON public.daily_products (expires_at, stock_quantity);
CREATE INDEX IF NOT EXISTS idx_daily_products_seller_expires ON public.daily_products (seller_id, expires_at DESC);

-- 3) sellers ordering and lookups
CREATE INDEX IF NOT EXISTS idx_sellers_is_verified ON public.sellers (is_verified);

-- 4) orders by seller and created_at (used for dashboards)
CREATE INDEX IF NOT EXISTS idx_orders_seller_created ON public.orders (seller_id, created_at DESC);

-- 5) order_items by order
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

-- Note: indexes increase write cost slightly; keep only those used by queries above.
