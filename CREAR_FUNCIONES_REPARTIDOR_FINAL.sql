-- =====================================================
-- FUNCIONES REPARTIDORES - NOMBRES ÚNICOS SIN CONFLICTOS
-- =====================================================
-- Ejecutar DESPUÉS de ejecutar LIMPIAR_FUNCIONES_PRIMERO.sql

-- ✅ FUNCIÓN 1: Actualizar estado de entrega (nombre único)
CREATE OR REPLACE FUNCTION public.driver_update_order_status(
    p_order_id UUID,
    p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN := FALSE;
BEGIN
    -- Validar estado
    IF p_status NOT IN ('assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Estado inválido: ' || p_status
        );
    END IF;

    -- Actualizar orden
    UPDATE orders 
    SET 
        status = p_status,
        picked_up_at = CASE 
            WHEN p_status = 'picked_up' AND picked_up_at IS NULL THEN NOW()
            ELSE picked_up_at
        END,
        delivered_at = CASE 
            WHEN p_status = 'delivered' AND delivered_at IS NULL THEN NOW()
            ELSE delivered_at
        END,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Estado actualizado a: ' || p_status,
            'order_id', p_order_id
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Pedido no encontrado'
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error: ' || SQLERRM
    );
END;
$$;

-- ✅ FUNCIÓN 2: Obtener historial de entregas (nombre único)
CREATE OR REPLACE FUNCTION public.driver_get_completed_orders(
    p_driver_id UUID
)
RETURNS TABLE (
    order_id UUID,
    customer_name TEXT,
    business_name TEXT,
    delivery_fee NUMERIC,
    delivered_at TIMESTAMPTZ,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.customer_name,
        COALESCE(b.name, 'Restaurante') as business_name,
        o.delivery_fee,
        o.delivered_at,
        o.total_amount
    FROM orders o
    LEFT JOIN businesses b ON o.business_id = b.id
    WHERE o.driver_id = p_driver_id
        AND o.status = 'delivered'
        AND o.delivered_at IS NOT NULL
    ORDER BY o.delivered_at DESC
    LIMIT 100;
END;
$$;

-- ✅ PERMISOS
GRANT EXECUTE ON FUNCTION public.driver_update_order_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_get_completed_orders(UUID) TO authenticated;

-- ✅ VERIFICACIÓN
SELECT 
    'driver_update_order_status' as function_name,
    'Función creada exitosamente' as status
UNION ALL
SELECT 
    'driver_get_completed_orders' as function_name,
    'Función creada exitosamente' as status;
