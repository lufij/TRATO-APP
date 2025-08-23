-- =====================================================
-- FUNCIONES ESENCIALES PARA REPARTIDORES - EJECUTAR MANUALMENTE
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 🗑️ PRIMERO ELIMINAR FUNCIONES EXISTENTES
DROP FUNCTION IF EXISTS public.update_order_status CASCADE;
DROP FUNCTION IF EXISTS public.get_driver_delivery_history CASCADE;

-- 1️⃣ FUNCIÓN PARA ACTUALIZAR ESTADO DE PEDIDOS
CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_driver_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_record RECORD;
    v_result JSON;
BEGIN
    -- Validar que el estado sea válido
    IF p_new_status NOT IN ('ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Estado no válido: ' || p_new_status
        );
    END IF;
    
    -- Obtener información actual del pedido
    SELECT * INTO v_order_record
    FROM orders 
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Pedido no encontrado'
        );
    END IF;
    
    -- Actualizar el pedido con el nuevo estado
    UPDATE orders 
    SET 
        status = p_new_status,
        driver_id = COALESCE(p_driver_id, driver_id),
        picked_up_at = CASE 
            WHEN p_new_status = 'picked_up' AND picked_up_at IS NULL THEN NOW()
            ELSE picked_up_at
        END,
        delivered_at = CASE 
            WHEN p_new_status = 'delivered' AND delivered_at IS NULL THEN NOW()
            ELSE delivered_at
        END,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Crear notificación del cambio de estado (si existe la tabla)
    BEGIN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            order_id,
            created_at
        ) VALUES (
            v_order_record.user_id,
            'Estado del pedido actualizado',
            'Tu pedido ahora está: ' || 
            CASE p_new_status
                WHEN 'assigned' THEN 'Asignado a repartidor'
                WHEN 'picked_up' THEN 'Recogido del restaurante'
                WHEN 'in_transit' THEN 'En camino'
                WHEN 'delivered' THEN 'Entregado'
                WHEN 'cancelled' THEN 'Cancelado'
                ELSE p_new_status
            END,
            'order_update',
            p_order_id,
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignorar errores de notificación
        NULL;
    END;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Estado actualizado correctamente',
        'order_id', p_order_id,
        'new_status', p_new_status
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno: ' || SQLERRM
    );
END;
$$;

-- 2️⃣ FUNCIÓN PARA OBTENER HISTORIAL DE ENTREGAS
CREATE OR REPLACE FUNCTION public.get_driver_delivery_history(p_driver_id UUID)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    pickup_address TEXT,
    delivery_address TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount NUMERIC,
    delivery_fee NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    pickup_notes TEXT,
    delivery_notes TEXT,
    items_count INTEGER,
    business_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.id as order_id,
        o.pickup_address,
        o.delivery_address,
        o.customer_name,
        o.customer_phone,
        o.total_amount,
        o.delivery_fee,
        o.status,
        o.created_at,
        o.picked_up_at,
        o.delivered_at,
        o.pickup_notes,
        o.delivery_notes,
        (SELECT COUNT(*)::INTEGER FROM order_items oi WHERE oi.order_id = o.id) as items_count,
        COALESCE(b.name, 'Restaurante') as business_name
    FROM orders o
    LEFT JOIN businesses b ON o.business_id = b.id
    WHERE o.driver_id = p_driver_id
        AND o.status = 'delivered'
    ORDER BY o.delivered_at DESC;
END;
$$;

-- 3️⃣ PERMISOS
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_delivery_history(UUID) TO authenticated;
