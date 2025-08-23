-- =====================================================
-- SCRIPT REPARACIÓN RÁPIDA - FUNCIONES REPARTIDORES
-- =====================================================
-- Ejecutar línea por línea en SQL Editor de Supabase

-- ❌ PASO 1: Eliminar funciones conflictivas
DROP FUNCTION IF EXISTS public.update_order_status CASCADE;

-- ✅ PASO 2: Crear función simple para actualizar estado
CREATE OR REPLACE FUNCTION public.update_delivery_status(
    order_uuid UUID,
    new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Actualizar el pedido
    UPDATE orders 
    SET 
        status = new_status,
        picked_up_at = CASE 
            WHEN new_status = 'picked_up' AND picked_up_at IS NULL THEN NOW()
            ELSE picked_up_at
        END,
        delivered_at = CASE 
            WHEN new_status = 'delivered' AND delivered_at IS NULL THEN NOW()
            ELSE delivered_at
        END,
        updated_at = NOW()
    WHERE id = order_uuid;
    
    RETURN FOUND;
END;
$$;

-- ✅ PASO 3: Permisos
GRANT EXECUTE ON FUNCTION public.update_delivery_status(UUID, TEXT) TO authenticated;

-- ✅ PASO 4: Función historial simple
CREATE OR REPLACE FUNCTION public.get_delivery_history(driver_uuid UUID)
RETURNS TABLE (
    order_id UUID,
    delivery_fee NUMERIC,
    delivered_at TIMESTAMPTZ,
    customer_name TEXT,
    business_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.delivery_fee,
        o.delivered_at,
        o.customer_name,
        COALESCE(b.name, 'Restaurante') as business_name
    FROM orders o
    LEFT JOIN businesses b ON o.business_id = b.id
    WHERE o.driver_id = driver_uuid
        AND o.status = 'delivered'
    ORDER BY o.delivered_at DESC;
END;
$$;

-- ✅ PASO 5: Permisos historial
GRANT EXECUTE ON FUNCTION public.get_delivery_history(UUID) TO authenticated;
