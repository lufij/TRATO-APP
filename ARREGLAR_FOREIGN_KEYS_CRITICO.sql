-- ARREGLAR FOREIGN KEYS CRÍTICO - EJECUTAR EN SUPABASE SQL EDITOR

-- 1. Eliminar foreign keys rotas
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_driver_id_fkey;

-- 2. Crear foreign keys correctas que Supabase pueda usar en REST API
ALTER TABLE orders 
ADD CONSTRAINT orders_buyer_id_fkey 
FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL;

-- seller_id debe referenciar la tabla sellers, NO users
ALTER TABLE orders 
ADD CONSTRAINT orders_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD CONSTRAINT orders_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. REINICIAR SCHEMA CACHE DE SUPABASE
SELECT pg_reload_conf();

-- 4. Verificar foreign keys
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
  AND tc.table_name='orders';

-- 5. Verificar que la orden específica existe
SELECT 
    o.id,
    o.status,
    o.customer_name,
    o.driver_id,
    u.name as repartidor
FROM orders o
LEFT JOIN users u ON o.driver_id = u.id
WHERE o.id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
