-- =====================================================
-- DIAGNÓSTICO ERROR ACEPTAR ÓRDENES
-- =====================================================

-- 1. Verificar estructura ORDER_ITEMS
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si existe product_type en order_items
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'order_items' AND column_name = 'product_type'
        ) THEN 'PRODUCT_TYPE EXISTE ✅'
        ELSE 'PRODUCT_TYPE NO EXISTE ❌'
    END as diagnostico;

-- 3. Ver órdenes pendientes
SELECT 
    id,
    status,
    seller_id,
    total,
    created_at
FROM orders 
WHERE status = 'pending'
LIMIT 3;

-- 4. Ver order_items de órdenes pendientes
SELECT 
    oi.*
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'pending'
LIMIT 5;
