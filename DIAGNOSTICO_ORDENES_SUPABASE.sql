-- CONSULTAS DE DIAGNÓSTICO PARA INVESTIGAR EL PROBLEMA DE ÓRDENES
-- ================================================================
-- Ejecutar estas consultas en Supabase SQL Editor para diagnosticar

-- 1. VERIFICAR ESTADO REAL DE LAS ÓRDENES
SELECT 
    '1. ESTADO ACTUAL DE TODAS LAS ÓRDENES' as seccion,
    id,
    order_number,
    status,
    delivery_type,
    delivery_method,
    created_at,
    accepted_at,
    ready_at,
    completed_at,
    seller_id,
    buyer_id
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. BUSCAR LA ORDEN QUE ACABAS DE ACEPTAR
-- (Reemplaza 'TU_NUMERO_ORDEN' con el número de la orden que intentaste aceptar)
SELECT 
    '2. ORDEN ESPECÍFICA PROBLEMÁTICA' as seccion,
    *
FROM orders 
WHERE order_number = '3 sep 2025-02:09 p. m.' -- Cambiar por el número de tu orden
OR status = 'pending'
ORDER BY created_at DESC;

-- 3. VERIFICAR QUE LAS FUNCIONES REALMENTE ACTUALICEN LA BD
SELECT 
    '3. ÓRDENES PENDIENTES VS ACEPTADAS' as seccion,
    status,
    COUNT(*) as cantidad,
    MIN(created_at) as primera,
    MAX(created_at) as ultima
FROM orders 
GROUP BY status
ORDER BY status;

-- 4. VERIFICAR CONSTRAINTS Y TRIGGERS EN LA TABLA ORDERS
SELECT 
    '4. CONSTRAINTS DE LA TABLA ORDERS' as seccion,
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.table_schema = 'public';

-- 5. VERIFICAR SI HAY TRIGGERS QUE PUEDAN ESTAR INTERFIRIENDO
SELECT 
    '5. TRIGGERS EN LA TABLA ORDERS' as seccion,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders' 
AND trigger_schema = 'public';

-- 6. PROBAR MANUALMENTE LA FUNCIÓN seller_accept_order
-- (Reemplaza los UUIDs con los reales de tu sistema)
SELECT 
    '6. PROBAR FUNCIÓN MANUALMENTE' as seccion,
    seller_accept_order(
        '00000000-0000-0000-0000-000000000000'::UUID, -- ORDER_ID (cambiar)
        '00000000-0000-0000-0000-000000000000'::UUID  -- SELLER_ID (cambiar)
    ) as resultado;

-- 7. VERIFICAR LA FUNCIÓN seller_accept_order
SELECT 
    '7. CÓDIGO DE LA FUNCIÓN ACCEPT_ORDER' as seccion,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'seller_accept_order' 
AND routine_schema = 'public';

-- 8. VERIFICAR POLÍTICAS RLS (ROW LEVEL SECURITY)
SELECT 
    '8. POLÍTICAS RLS EN ORDERS' as seccion,
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

-- 9. VERIFICAR PERMISOS DE USUARIO ACTUAL
SELECT 
    '9. USUARIO ACTUAL Y PERMISOS' as seccion,
    current_user as usuario_actual,
    session_user as usuario_sesion;

-- 10. BUSCAR ÓRDENES CON PROBLEMAS DE ESTADO
SELECT 
    '10. ÓRDENES CON TIMESTAMPS INCONSISTENTES' as seccion,
    id,
    order_number,
    status,
    created_at,
    accepted_at,
    ready_at,
    CASE 
        WHEN status = 'accepted' AND accepted_at IS NULL THEN 'PROBLEMA: Aceptada sin timestamp'
        WHEN status = 'ready' AND ready_at IS NULL THEN 'PROBLEMA: Lista sin timestamp'
        WHEN status = 'pending' AND accepted_at IS NOT NULL THEN 'PROBLEMA: Pendiente con timestamp de aceptación'
        ELSE 'OK'
    END as problema
FROM orders 
WHERE 
    (status = 'accepted' AND accepted_at IS NULL) OR
    (status = 'ready' AND ready_at IS NULL) OR
    (status = 'pending' AND accepted_at IS NOT NULL)
ORDER BY created_at DESC;

-- 11. VERIFICAR SI HAY MÚLTIPLES ÓRDENES CON EL MISMO NÚMERO
SELECT 
    '11. ÓRDENES DUPLICADAS' as seccion,
    order_number,
    COUNT(*) as cantidad,
    array_agg(id) as ids,
    array_agg(status) as estados
FROM orders 
GROUP BY order_number 
HAVING COUNT(*) > 1;

-- 12. ANÁLISIS COMPLETO DE LA ORDEN PROBLEMÁTICA
-- Ejecuta esto después de identificar el ID de la orden problemática
DO $$
DECLARE
    orden_id UUID := '00000000-0000-0000-0000-000000000000'; -- CAMBIAR POR EL ID REAL
    info RECORD;
BEGIN
    SELECT * INTO info FROM orders WHERE id = orden_id;
    
    RAISE NOTICE '=== ANÁLISIS DE ORDEN ===';
    RAISE NOTICE 'ID: %', info.id;
    RAISE NOTICE 'Número: %', info.order_number;
    RAISE NOTICE 'Status: %', info.status;
    RAISE NOTICE 'Seller ID: %', info.seller_id;
    RAISE NOTICE 'Buyer ID: %', info.buyer_id;
    RAISE NOTICE 'Created: %', info.created_at;
    RAISE NOTICE 'Accepted: %', info.accepted_at;
    RAISE NOTICE 'Ready: %', info.ready_at;
    RAISE NOTICE 'Delivery Type: %', COALESCE(info.delivery_type, info.delivery_method, 'NULL');
END $$;

-- 13. CREAR FUNCIÓN DE DIAGNÓSTICO TEMPORAL
CREATE OR REPLACE FUNCTION diagnosticar_orden(orden_uuid UUID) 
RETURNS TABLE (
    campo TEXT,
    valor TEXT,
    problema TEXT
) AS $$
DECLARE
    orden_record RECORD;
BEGIN
    SELECT * INTO orden_record FROM orders WHERE id = orden_uuid;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'ORDEN'::TEXT, 'NO ENCONTRADA'::TEXT, 'CRÍTICO'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 'id'::TEXT, orden_record.id::TEXT, 'OK'::TEXT;
    RETURN QUERY SELECT 'order_number'::TEXT, orden_record.order_number::TEXT, 'OK'::TEXT;
    RETURN QUERY SELECT 'status'::TEXT, orden_record.status::TEXT, 
        CASE WHEN orden_record.status NOT IN ('pending', 'accepted', 'ready', 'completed', 'cancelled') 
             THEN 'ESTADO INVÁLIDO' ELSE 'OK' END::TEXT;
    RETURN QUERY SELECT 'seller_id'::TEXT, COALESCE(orden_record.seller_id::TEXT, 'NULL'), 
        CASE WHEN orden_record.seller_id IS NULL THEN 'SIN VENDEDOR' ELSE 'OK' END::TEXT;
    RETURN QUERY SELECT 'accepted_at'::TEXT, COALESCE(orden_record.accepted_at::TEXT, 'NULL'),
        CASE WHEN orden_record.status = 'accepted' AND orden_record.accepted_at IS NULL 
             THEN 'INCONSISTENCIA' ELSE 'OK' END::TEXT;
    RETURN QUERY SELECT 'delivery_type'::TEXT, COALESCE(orden_record.delivery_type, orden_record.delivery_method, 'NULL'),
        'OK'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Para usar la función de diagnóstico:
-- SELECT * FROM diagnosticar_orden('TU_ORDER_ID_AQUI'::UUID);
