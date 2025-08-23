-- 🔍 DIAGNÓSTICO SIMPLE REPARTIDORES
-- Script simplificado para diagnosticar el problema de repartidores

-- =====================================================
-- 1. VERIFICAR ÓRDENES EXISTENTES
-- =====================================================

SELECT 
    'TOTAL DE ÓRDENES' as info,
    COUNT(*) as cantidad
FROM public.orders;

-- =====================================================
-- 2. VERIFICAR ÓRDENES POR ESTADO
-- =====================================================

SELECT 
    'ÓRDENES POR ESTADO' as info,
    status,
    COUNT(*) as cantidad
FROM public.orders
GROUP BY status
ORDER BY cantidad DESC;

-- =====================================================
-- 3. VERIFICAR ESTRUCTURA DE LA TABLA ORDERS
-- =====================================================

SELECT 
    'COLUMNAS EN TABLA ORDERS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 4. VERIFICAR ÓRDENES DISPONIBLES (SIMPLE)
-- =====================================================

SELECT 
    'ÓRDENES DISPONIBLES PARA DELIVERY' as info,
    o.id,
    o.status,
    o.delivery_type,
    o.driver_id,
    o.total_amount,
    o.total,
    o.created_at,
    s.name as vendedor_name
FROM public.orders o
LEFT JOIN public.users s ON o.seller_id = s.id
WHERE o.status IN ('ready', 'confirmed')
AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
AND o.driver_id IS NULL
ORDER BY o.created_at ASC;

-- =====================================================
-- 5. VERIFICAR REPARTIDORES
-- =====================================================

SELECT 
    'REPARTIDORES EN SISTEMA' as info,
    COUNT(*) as total
FROM public.users
WHERE role = 'repartidor';

-- =====================================================
-- 6. PROBAR FUNCIÓN RPC
-- =====================================================

SELECT 'PROBANDO FUNCIÓN get_available_deliveries()' as info;

SELECT * FROM public.get_available_deliveries();

-- =====================================================
-- 7. CREAR ORDEN DE PRUEBA SI ES NECESARIO
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
    
    RAISE NOTICE 'Órdenes disponibles encontradas: %', v_order_count;
    
    IF v_order_count = 0 THEN
        -- Buscar un vendedor
        SELECT id INTO v_seller_id
        FROM public.users 
        WHERE role = 'seller' 
        LIMIT 1;
        
        IF v_seller_id IS NOT NULL THEN
            -- Crear orden de prueba
            v_test_order_id := gen_random_uuid();
            
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
                v_test_order_id,
                v_seller_id,
                'ready',
                'delivery',
                25.50,
                25.50,
                'Dirección de prueba 123',
                30,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Orden de prueba creada con ID: %', v_test_order_id;
        ELSE
            RAISE NOTICE 'No se encontraron vendedores para crear orden de prueba';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

SELECT 'VERIFICACIÓN FINAL - Órdenes después del diagnóstico' as info;

SELECT * FROM public.get_available_deliveries();

-- =====================================================
-- 9. RESUMEN
-- =====================================================

SELECT 
    'RESUMEN FINAL' as tipo,
    COUNT(*) as total_ordenes,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ordenes_ready,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as ordenes_confirmed,
    COUNT(CASE WHEN driver_id IS NULL THEN 1 END) as sin_repartidor,
    COUNT(CASE WHEN delivery_type = 'delivery' THEN 1 END) as tipo_delivery
FROM public.orders;
