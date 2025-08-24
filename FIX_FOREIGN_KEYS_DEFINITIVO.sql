-- FIX DEFINITIVO DE FOREIGN KEYS PARA RESOLVER PGRST200

-- 1. Verificar estructura actual de orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('seller_id', 'buyer_id', 'driver_id')
ORDER BY ordinal_position;

-- 2. Verificar estructura de sellers
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sellers' AND column_name = 'id'
ORDER BY ordinal_position;

-- 3. Eliminar ALL foreign keys existentes de orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_driver_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_buyer;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_seller;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_driver;

-- 4. Verificar que las tablas referenciadas existen
SELECT 'users' as table_name, count(*) as exists FROM users LIMIT 1
UNION ALL
SELECT 'sellers' as table_name, count(*) as exists FROM sellers LIMIT 1;

-- 5. Crear foreign keys CORRECTAS
-- buyer_id -> users(id)
ALTER TABLE orders 
ADD CONSTRAINT orders_buyer_id_fkey 
FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL;

-- seller_id -> sellers(id) [NO users!]
ALTER TABLE orders 
ADD CONSTRAINT orders_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;

-- driver_id -> users(id)
ALTER TABLE orders 
ADD CONSTRAINT orders_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL;

-- 6. Verificar foreign keys creadas
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='orders'
ORDER BY kcu.column_name;

-- 7. Forzar refresh del schema cache
NOTIFY pgrst, 'reload schema';

-- 8. Verificar la orden específica con JOINs
SELECT 
    o.id,
    o.status,
    o.customer_name,
    o.driver_id,
    u.name as driver_name,
    o.seller_id,
    s.business_name as seller_business
FROM orders o
LEFT JOIN users u ON o.driver_id = u.id
LEFT JOIN sellers s ON o.seller_id = s.id
WHERE o.id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
