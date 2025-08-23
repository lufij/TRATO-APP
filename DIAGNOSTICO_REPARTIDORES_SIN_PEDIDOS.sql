-- 🚚 DIAGNOSTICO Y SOLUCION PARA REPARTIDORES SIN PEDIDOS
-- Ejecuta este script para identificar y resolver por qué no aparecen pedidos

-- =====================================================
-- 1. DIAGNÓSTICO: VERIFICAR ESTADO ACTUAL
-- =====================================================

-- Ver todos los pedidos existentes
SELECT 
    '📊 RESUMEN DE PEDIDOS' as tipo,
    status,
    delivery_type,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN driver_id IS NULL THEN 1 END) as sin_repartidor
FROM public.orders 
GROUP BY status, delivery_type
ORDER BY status;

-- Ver pedidos específicos que deberían ver los repartidores
SELECT 
    '🚚 PEDIDOS PARA REPARTIDORES' as tipo,
    o.id,
    o.status,
    o.delivery_type,
    o.driver_id,
    COALESCE(o.total_amount, o.total, 0) as total,
    o.created_at,
    u.name as vendedor,
    u.business_name
FROM public.orders o
LEFT JOIN public.users u ON o.seller_id = u.id
WHERE o.delivery_type = 'delivery'
AND o.driver_id IS NULL
ORDER BY o.created_at DESC;

-- Ver función get_available_deliveries
SELECT 
    '🔍 PEDIDOS FUNCIÓN RPC' as tipo,
    *
FROM public.get_available_deliveries();

-- =====================================================
-- 2. CORRECCION: ACTUALIZAR ESTADOS SI ES NECESARIO
-- =====================================================

-- Opción 1: Si hay pedidos 'confirmed' que deberían estar 'ready'
DO $$
BEGIN
    -- Cambiar pedidos confirmados más antiguos a 'ready' automáticamente
    UPDATE public.orders 
    SET status = 'ready'
    WHERE status = 'confirmed' 
    AND delivery_type = 'delivery'
    AND driver_id IS NULL
    AND created_at < NOW() - INTERVAL '5 minutes'; -- Pedidos de hace más de 5 minutos
    
    RAISE NOTICE '✅ Pedidos actualizados a estado ready para repartidores';
END $$;

-- Opción 2: Crear pedido de prueba si no hay ninguno
DO $$
DECLARE
    test_order_id UUID;
    test_seller_id UUID;
    test_buyer_id UUID;
BEGIN
    -- Verificar si no hay pedidos disponibles
    IF NOT EXISTS (
        SELECT 1 FROM public.orders 
        WHERE status IN ('ready', 'confirmed') 
        AND delivery_type = 'delivery' 
        AND driver_id IS NULL
    ) THEN
        -- Buscar un vendedor y comprador para crear pedido de prueba
        SELECT id INTO test_seller_id 
        FROM public.users 
        WHERE role = 'vendedor' 
        LIMIT 1;
        
        SELECT id INTO test_buyer_id 
        FROM public.users 
        WHERE role = 'comprador' 
        LIMIT 1;
        
        -- Si encontramos vendedor y comprador, crear pedido de prueba
        IF test_seller_id IS NOT NULL AND test_buyer_id IS NOT NULL THEN
            INSERT INTO public.orders (
                buyer_id,
                seller_id,
                total_amount,
                total,
                subtotal,
                delivery_fee,
                delivery_type,
                delivery_address,
                customer_name,
                phone_number,
                customer_notes,
                payment_method,
                status,
                created_at
            ) VALUES (
                test_buyer_id,
                test_seller_id,
                85.00,
                85.00,
                70.00,
                15.00,
                'delivery',
                'Zona 10, Ciudad de Guatemala, Guatemala',
                'Cliente de Prueba',
                '+502 5555-1234',
                'Pedido de prueba para repartidores',
                'cash',
                'ready', -- Estado listo para repartidores
                NOW()
            ) RETURNING id INTO test_order_id;
            
            -- Crear items del pedido de prueba
            INSERT INTO public.order_items (
                order_id,
                product_id,
                product_name,
                quantity,
                unit_price,
                price,
                notes
            ) VALUES (
                test_order_id,
                gen_random_uuid(), -- ID random del producto
                'Pizza Margherita - Prueba',
                2,
                35.00,
                35.00,
                'Pedido de prueba para sistema de repartidores'
            );
            
            RAISE NOTICE '🎯 Pedido de prueba creado con ID: %', test_order_id;
            RAISE NOTICE '📍 Estado: ready | Tipo: delivery | Total: Q85.00';
        ELSE
            RAISE NOTICE '⚠️ No se pueden crear pedidos de prueba: faltan usuarios vendedor/comprador';
        END IF;
    ELSE
        RAISE NOTICE '✅ Ya existen pedidos disponibles para repartidores';
    END IF;
END $$;

-- =====================================================
-- 3. VERIFICACION FINAL
-- =====================================================

-- Mostrar resultado final
SELECT 
    '🎯 RESULTADO FINAL' as tipo,
    COUNT(*) as pedidos_disponibles,
    string_agg(
        'ID: ' || id::text || ' | Total: Q' || COALESCE(total_amount, total, 0)::text, 
        ' | '
    ) as detalles
FROM public.get_available_deliveries();

-- Mostrar funciones necesarias para repartidores
SELECT 
    '🔧 FUNCIONES RPC' as tipo,
    proname as funcion,
    CASE 
        WHEN proname IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM pg_proc 
WHERE proname IN ('get_available_deliveries', 'assign_driver_to_order', 'update_order_status')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

RAISE NOTICE '🚚 Diagnóstico completado. Revisa los resultados de las consultas.';
