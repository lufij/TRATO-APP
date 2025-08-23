-- 🔧 REPARAR FUNCIÓN get_available_deliveries
-- Script para corregir la función RPC que tiene el error de business_name

-- =====================================================
-- CORREGIR FUNCIÓN get_available_deliveries
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_available_deliveries()
RETURNS TABLE (
    order_id UUID,
    seller_name TEXT,
    seller_address TEXT,
    delivery_address TEXT,
    total DECIMAL(10,2),
    estimated_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    distance_km DECIMAL(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        COALESCE(s.name, 'Vendedor') as seller_name,
        COALESCE(s.address, 'Dirección no disponible') as seller_address,
        COALESCE(o.delivery_address, 'Dirección no especificada') as delivery_address,
        COALESCE(o.total_amount, o.total, 0.00) as total,
        COALESCE(o.estimated_time, 30) as estimated_time,
        o.created_at,
        NULL::DECIMAL(5,2) as distance_km
    FROM public.orders o
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.status IN ('ready', 'confirmed')
    AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
    AND o.driver_id IS NULL
    ORDER BY o.created_at ASC;
END;
$$;

-- =====================================================
-- OTORGAR PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_available_deliveries() TO authenticated;

-- =====================================================
-- PROBAR LA FUNCIÓN CORREGIDA
-- =====================================================

SELECT 'FUNCIÓN CORREGIDA - PROBANDO' as resultado;

SELECT * FROM public.get_available_deliveries();

-- =====================================================
-- VERIFICAR ESTRUCTURA DE LA TABLA USERS
-- =====================================================

SELECT 
    'COLUMNAS EN TABLA USERS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- CREAR ORDEN DE PRUEBA SI NO HAY NINGUNA
-- =====================================================

DO $$
DECLARE
    v_seller_id UUID;
    v_order_count INTEGER;
    v_test_order_id UUID;
BEGIN
    -- Verificar si hay órdenes disponibles
    SELECT COUNT(*) INTO v_order_count
    FROM public.orders 
    WHERE status IN ('ready', 'confirmed')
    AND COALESCE(delivery_type, 'delivery') = 'delivery'
    AND driver_id IS NULL;
    
    RAISE NOTICE 'Órdenes disponibles: %', v_order_count;
    
    IF v_order_count = 0 THEN
        -- Buscar cualquier usuario con role seller
        SELECT id INTO v_seller_id
        FROM public.users 
        WHERE role = 'seller' 
        LIMIT 1;
        
        IF v_seller_id IS NULL THEN
            -- Si no hay seller, buscar cualquier usuario
            SELECT id INTO v_seller_id
            FROM public.users 
            LIMIT 1;
        END IF;
        
        IF v_seller_id IS NOT NULL THEN
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
                'Calle Principal 123, Ciudad',
                30,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Orden de prueba creada: %', v_test_order_id;
        ELSE
            RAISE NOTICE 'No se encontraron usuarios para crear orden de prueba';
        END IF;
    END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 'RESULTADO FINAL' as estado;

SELECT * FROM public.get_available_deliveries();

RAISE NOTICE '✅ Función get_available_deliveries() corregida y probada';
