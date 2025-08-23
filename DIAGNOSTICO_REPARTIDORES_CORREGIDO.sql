-- 🔍 DIAGNÓSTICO REPARTIDORES - VERSIÓN CORREGIDA
-- Script para diagnosticar por qué los repartidores no ven pedidos disponibles

-- =====================================================
-- 1. VERIFICAR ÓRDENES EXISTENTES
-- =====================================================

SELECT 
    'ESTADO DE ÓRDENES' as diagnostico,
    COUNT(*) as total_ordenes
FROM public.orders;

SELECT 
    'ÓRDENES POR ESTADO' as diagnostico,
    status,
    COUNT(*) as cantidad
FROM public.orders
GROUP BY status
ORDER BY cantidad DESC;

-- =====================================================
-- 2. VERIFICAR ÓRDENES DISPONIBLES PARA REPARTIDORES
-- =====================================================

SELECT 
    'ÓRDENES DISPONIBLES PARA DELIVERY' as diagnostico,
    o.id,
    o.status,
    o.delivery_type,
    o.driver_id,
    o.total_amount,
    o.total,
    o.created_at,
    s.name as vendedor,
    s.business_name
FROM public.orders o
LEFT JOIN public.users s ON o.seller_id = s.id
WHERE o.status IN ('ready', 'confirmed')
AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
AND o.driver_id IS NULL
ORDER BY o.created_at ASC;

-- =====================================================
-- 3. VERIFICAR SI EXISTEN REPARTIDORES
-- =====================================================

SELECT 
    'REPARTIDORES REGISTRADOS' as diagnostico,
    COUNT(*) as total_repartidores,
    COUNT(CASE WHEN role = 'repartidor' THEN 1 END) as repartidores_activos
FROM public.users
WHERE role = 'repartidor' OR role LIKE '%repartidor%';

-- =====================================================
-- 4. VERIFICAR FUNCIONES RPC
-- =====================================================

SELECT 
    'FUNCIONES RPC DISPONIBLES' as diagnostico,
    proname as nombre_funcion,
    prosrc LIKE '%get_available_deliveries%' as es_funcion_repartidor
FROM pg_proc 
WHERE proname IN (
    'get_available_deliveries', 
    'assign_driver_to_order', 
    'update_order_status'
);

-- =====================================================
-- 5. PRUEBA DE LA FUNCIÓN get_available_deliveries
-- =====================================================

SELECT 'PRUEBA FUNCIÓN RPC' as diagnostico;

SELECT * FROM public.get_available_deliveries();

-- =====================================================
-- 6. CREAR ORDEN DE PRUEBA SI NO HAY NINGUNA
-- =====================================================

DO $$
DECLARE
    v_seller_id UUID;
    v_order_count INTEGER;
    v_test_order_id UUID;
BEGIN
    -- Contar órdenes disponibles
    SELECT COUNT(*) INTO v_order_count
    FROM public.orders 
    WHERE status IN ('ready', 'confirmed')
    AND COALESCE(delivery_type, 'delivery') = 'delivery'
    AND driver_id IS NULL;
    
    IF v_order_count = 0 THEN
        -- Buscar un vendedor
        SELECT id INTO v_seller_id
        FROM public.users 
        WHERE role = 'seller' 
        LIMIT 1;
        
        IF v_seller_id IS NOT NULL THEN
            -- Crear orden de prueba
            INSERT INTO public.orders (
                id,
                seller_id,
                status,
                delivery_type,
                total_amount,
                total,
                delivery_address,
                estimated_time,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_seller_id,
                'ready',
                'delivery',
                25.50,
                25.50,
                'Dirección de prueba 123, Ciudad',
                30,
                NOW(),
                NOW()
            ) RETURNING id INTO v_test_order_id;
            
            RAISE NOTICE 'Orden de prueba creada: %', v_test_order_id;
        ELSE
            RAISE NOTICE 'No se encontraron vendedores para crear orden de prueba';
        END IF;
    ELSE
        RAISE NOTICE 'Ya existen % órdenes disponibles', v_order_count;
    END IF;
END $$;

-- =====================================================
-- 7. ACTUALIZAR ÓRDENES CONFIRMED A READY
-- =====================================================

DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE public.orders 
    SET status = 'ready', updated_at = NOW()
    WHERE status = 'confirmed' 
    AND COALESCE(delivery_type, 'delivery') = 'delivery'
    AND driver_id IS NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RAISE NOTICE 'Se actualizaron % órdenes de "confirmed" a "ready"', v_updated_count;
    ELSE
        RAISE NOTICE 'No se encontraron órdenes "confirmed" para actualizar';
    END IF;
END $$;

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

SELECT 
    'VERIFICACIÓN FINAL' as diagnostico,
    'Órdenes disponibles después del diagnóstico' as descripcion;

SELECT * FROM public.get_available_deliveries();

-- Mostrar resumen
SELECT 
    'RESUMEN DIAGNÓSTICO' as resultado,
    COUNT(CASE WHEN status IN ('ready', 'confirmed') AND COALESCE(delivery_type, 'delivery') = 'delivery' AND driver_id IS NULL THEN 1 END) as ordenes_disponibles,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ordenes_ready,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as ordenes_confirmed,
    COUNT(*) as total_ordenes
FROM public.orders;
