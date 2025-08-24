-- VERIFICAR TABLA SELLERS Y SUS RELACIONES

-- 1. Verificar que la tabla sellers existe
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sellers'
ORDER BY ordinal_position;

-- 2. Verificar foreign keys de orders hacia sellers
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
  AND kcu.column_name = 'seller_id';

-- 3. Verificar datos en la tabla sellers
SELECT id, name, business_name, created_at
FROM sellers
LIMIT 5;

-- 4. Verificar relación entre orders y sellers para la orden específica
SELECT 
    o.id as order_id,
    o.seller_id,
    s.name as seller_name,
    s.business_name
FROM orders o
LEFT JOIN sellers s ON o.seller_id = s.id
WHERE o.id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
