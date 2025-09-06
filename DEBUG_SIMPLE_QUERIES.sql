-- CONSULTAS SQL PARA DEBUGGEAR ÓRDENES (VERSIÓN SIMPLIFICADA)
-- =============================================================
-- Ejecutar estas consultas una por una en el SQL Editor de Supabase

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA ORDERS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VER ESTADO ACTUAL DE TODAS LAS ÓRDENES (LA MÁS IMPORTANTE)
SELECT 
    id,
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

-- 3. BUSCAR ÓRDENES CON PROBLEMAS - accepted sin accepted_at
SELECT 
    order_number,
    status,
    accepted_at,
    ready_at,
    updated_at,
    'Status accepted pero sin accepted_at' as problema
FROM orders 
WHERE status = 'accepted' AND accepted_at IS NULL;

-- 4. BUSCAR ÓRDENES CON PROBLEMAS - pending con accepted_at
SELECT 
    order_number,
    status,
    accepted_at,
    ready_at,
    updated_at,
    'Tiene accepted_at pero status pending' as problema
FROM orders 
WHERE accepted_at IS NOT NULL AND status = 'pending';

-- 5. VERIFICAR QUE LA FUNCIÓN seller_accept_order EXISTE
SELECT 
    routine_name,
    routine_type,
    'Función existe' as estado
FROM information_schema.routines 
WHERE routine_name = 'seller_accept_order'
AND routine_schema = 'public';

-- 6. VER TODAS LAS FUNCIONES DE SELLER DISPONIBLES
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE 'seller_%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- 7. VER ÚLTIMAS 15 ÓRDENES CON DETALLES BÁSICOS
SELECT 
    o.order_number,
    o.status,
    o.seller_id,
    o.buyer_id,
    o.delivery_type,
    o.total,
    o.created_at,
    o.accepted_at,
    o.ready_at,
    o.updated_at
FROM orders o
ORDER BY o.created_at DESC
LIMIT 15;

-- 8. CONTAR ÓRDENES POR STATUS
SELECT 
    status,
    COUNT(*) as cantidad
FROM orders 
GROUP BY status
ORDER BY cantidad DESC;

-- 9. VERIFICAR SI HAY TRIGGERS EN LA TABLA ORDERS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
AND trigger_schema = 'public';

-- 10. VERIFICAR POLÍTICAS RLS EN ORDERS
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders'
AND schemaname = 'public';
