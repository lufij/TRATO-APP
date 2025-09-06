-- VERIFICAR FUNCIONES DE GESTIÓN DE ÓRDENES DEL VENDEDOR
-- =========================================================

-- 1. VERIFICAR QUE LAS FUNCIONES SQL EXISTEN
SELECT 
    'FUNCIONES DE ÓRDENES' as seccion,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('seller_accept_order', 'seller_mark_ready')
AND routine_schema = 'public'
ORDER BY routine_name;

-- 2. VERIFICAR ESTRUCTURA DE LA TABLA ORDERS
SELECT 
    'ESTRUCTURA ORDERS' as seccion,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. VERIFICAR ÓRDENES PENDIENTES ACTUALES
SELECT 
    'ÓRDENES PENDIENTES' as seccion,
    id,
    order_number,
    status,
    seller_id,
    buyer_id,
    total,
    delivery_method,
    created_at
FROM orders 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 4. VERIFICAR ORDER_ITEMS DE ÓRDENES PENDIENTES
SELECT 
    'ORDER ITEMS PENDIENTES' as seccion,
    oi.order_id,
    o.order_number,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.product_type,
    oi.product_id,
    oi.daily_product_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC, oi.id;

-- 5. PROBAR LA FUNCIÓN seller_accept_order (SOLO PARA DEBUGGING - NO EJECUTAR EN PRODUCCIÓN)
-- Comentar la línea siguiente para evitar ejecución accidental
-- SELECT * FROM seller_accept_order('ORDER_ID_AQUI', 'SELLER_ID_AQUÍ');

-- 6. VERIFICAR PERMISOS RLS PARA EL VENDEDOR
SELECT 
    'POLÍTICAS RLS ORDERS' as seccion,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;
