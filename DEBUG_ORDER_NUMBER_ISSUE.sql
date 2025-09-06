-- DEBUG: VERIFICAR ESTRUCTURA DE TABLA ORDERS
-- =============================================

-- 1. Verificar si existe la columna order_number
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'order_number';

-- 2. Ver todas las columnas de orders
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 3. Probar la función directamente
SELECT * FROM seller_mark_ready_improved(
    'REPLACE_WITH_REAL_ORDER_ID'::UUID, 
    'REPLACE_WITH_REAL_SELLER_ID'::UUID
);

-- 4. Ver una orden de ejemplo para obtener IDs reales
SELECT id, seller_id, status, delivery_type 
FROM orders 
WHERE status = 'accepted' 
LIMIT 1;
