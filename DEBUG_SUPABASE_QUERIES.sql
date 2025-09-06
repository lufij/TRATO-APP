-- CONSULTAS SQL PARA DEBUGGEAR ÓRDENES EN SUPABASE
-- =================================================
-- Ejecutar estas consultas una por una en el SQL Editor de Supabase

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA ORDERS
SELECT 
    'ESTRUCTURA DE TABLA ORDERS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR CONSTRAINTS Y CHECKS
SELECT 
    'CONSTRAINTS DE ORDERS' as info,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.table_schema = 'public';

-- 3. VER ESTADO ACTUAL DE TODAS LAS ÓRDENES
SELECT 
    'ESTADO ACTUAL DE ÓRDENES' as info,
    order_number,
    status,
    seller_id,
    buyer_id,
    delivery_type,
    delivery_method,
    created_at,
    accepted_at,
    ready_at,
    updated_at,
    CASE 
        WHEN accepted_at IS NOT NULL THEN 'TIENE accepted_at'
        ELSE 'SIN accepted_at'
    END as estado_accepted_at
FROM orders 
WHERE status IN ('pending', 'accepted', 'ready')
ORDER BY created_at DESC
LIMIT 10;

-- 4. BUSCAR ÓRDENES QUE ESTÁN MAL (accepted sin accepted_at)
SELECT 
    'ÓRDENES CON INCONSISTENCIAS' as problema,
    order_number,
    status,
    accepted_at,
    ready_at,
    updated_at,
    'Status accepted pero sin accepted_at' as descripcion
FROM orders 
WHERE status = 'accepted' AND accepted_at IS NULL;

-- 5. BUSCAR ÓRDENES QUE DEBERÍAN ESTAR ACCEPTED
SELECT 
    'ÓRDENES QUE DEBERÍAN ESTAR ACCEPTED' as problema,
    order_number,
    status,
    accepted_at,
    ready_at,
    updated_at,
    'Tiene accepted_at pero status pending' as descripcion
FROM orders 
WHERE accepted_at IS NOT NULL AND status = 'pending';

-- 6. VERIFICAR FUNCIÓN seller_accept_order
SELECT 
    'FUNCIÓN seller_accept_order' as info,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'seller_accept_order';

-- 7. PROBAR FUNCIÓN MANUALMENTE (SUSTITUIR ORDER_ID y SELLER_ID)
-- SELECT * FROM seller_accept_order('ORDER_ID_AQUI'::uuid, 'SELLER_ID_AQUI'::uuid);

-- 8. VER TRIGGERS EN LA TABLA ORDERS
SELECT 
    'TRIGGERS EN ORDERS' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders';

-- 9. VERIFICAR POLÍTICAS RLS
SELECT 
    'POLÍTICAS RLS EN ORDERS' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- 10. VER ÚLTIMAS 20 ÓRDENES CON DETALLES COMPLETOS
SELECT 
    'ÓRDENES DETALLADAS' as info,
    o.order_number,
    o.status,
    o.seller_id,
    o.buyer_id,
    o.delivery_type,
    o.delivery_method,
    o.total,
    o.created_at,
    o.accepted_at,
    o.ready_at,
    o.updated_at,
    u.name as buyer_name,
    u.email as buyer_email,
    COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN users u ON o.buyer_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.name, u.email
ORDER BY o.created_at DESC
LIMIT 20;

-- 11. VERIFICAR SI HAY PRODUCTOS DEL DÍA RELACIONADOS
SELECT 
    'PRODUCTOS DEL DÍA EN ÓRDENES' as info,
    o.order_number,
    o.status,
    oi.product_name,
    oi.product_type,
    oi.daily_product_id,
    dp.name as daily_product_name,
    dp.is_available as daily_available
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN daily_products dp ON oi.daily_product_id = dp.id
WHERE o.status IN ('pending', 'accepted', 'ready')
AND oi.daily_product_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 15;
