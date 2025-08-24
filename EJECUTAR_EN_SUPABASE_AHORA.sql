-- EJECUTAR INMEDIATAMENTE EN SUPABASE SQL EDITOR
-- Este script resolverá definitivamente el problema PGRST200

-- 1. Eliminar TODAS las foreign keys existentes de orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_driver_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_buyer;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_seller;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_driver;

-- 2. Crear foreign keys CORRECTAS para Supabase REST API
-- buyer_id -> users(id)
ALTER TABLE orders 
ADD CONSTRAINT orders_buyer_id_fkey 
FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL;

-- seller_id -> sellers(id) [¡IMPORTANTE: sellers, NO users!]
ALTER TABLE orders 
ADD CONSTRAINT orders_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;

-- driver_id -> users(id)
ALTER TABLE orders 
ADD CONSTRAINT orders_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Forzar refresh del schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
