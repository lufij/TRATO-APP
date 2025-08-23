-- 🔧 REPARAR FUNCIÓN SIMPLE
-- Script simplificado sin RAISE NOTICE

-- =====================================================
-- 1. CORREGIR FUNCIÓN get_available_deliveries
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
-- 2. OTORGAR PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_available_deliveries() TO authenticated;

-- =====================================================
-- 3. PROBAR LA FUNCIÓN
-- =====================================================

SELECT * FROM public.get_available_deliveries();

-- =====================================================
-- 4. CREAR ORDEN DE PRUEBA
-- =====================================================

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
) 
SELECT 
    gen_random_uuid(),
    u.id,
    'ready',
    'delivery',
    25.50,
    25.50,
    'Calle de Prueba 123',
    30,
    NOW(),
    NOW()
FROM public.users u 
WHERE u.role = 'seller' 
LIMIT 1;

-- =====================================================
-- 5. VERIFICAR RESULTADO FINAL
-- =====================================================

SELECT 'ÓRDENES DISPONIBLES AHORA:' as resultado;

SELECT * FROM public.get_available_deliveries();
