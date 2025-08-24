-- =====================================================
-- DIAGNÓSTICO ERROR AL ACEPTAR ÓRDENES
-- =====================================================

-- 1. Verificar la orden específica que está fallando
SELECT 
    'ORDEN PROBLEMA:' as categoria,
    id,
    status,
    buyer_id,
    seller_id,
    total,
    delivery_type,
    created_at
FROM orders 
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';

-- 2. Verificar si existe la tabla notifications
SELECT 
    'TABLA NOTIFICATIONS:' as verificacion,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'notifications' AND table_schema = 'public'
        ) THEN 'EXISTE ✅'
        ELSE 'NO EXISTE ❌'
    END as estado;

-- 3. Verificar estructura de notifications si existe
SELECT 
    'ESTRUCTURA NOTIFICATIONS:' as categoria,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar función update_order_status
SELECT 
    'FUNCIÓN UPDATE_ORDER_STATUS:' as categoria,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'update_order_status' 
AND routine_schema = 'public';

-- 5. Verificar usuarios relacionados con la orden
SELECT 
    'USUARIOS RELACIONADOS:' as categoria,
    u.id,
    u.name,
    u.role,
    CASE 
        WHEN u.id = o.buyer_id THEN 'COMPRADOR'
        WHEN u.id = o.seller_id THEN 'VENDEDOR'
        ELSE 'OTRO'
    END as relacion
FROM orders o
LEFT JOIN auth.users u ON u.id IN (o.buyer_id, o.seller_id)
WHERE o.id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';

-- 6. Probar actualización simple sin notificaciones
UPDATE orders 
SET status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b'
AND seller_id = '561711e7-a66e-4166-93f0-3038666c4096';

-- 7. Verificar que se actualizó
SELECT 
    'ACTUALIZACIÓN EXITOSA:' as resultado,
    id,
    status,
    accepted_at,
    updated_at
FROM orders 
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
