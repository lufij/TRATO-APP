-- 🚚 CREAR FUNCIONES REPARTIDORES SI NO EXISTEN
-- Ejecuta este script para asegurar que todas las funciones RPC estén disponibles

-- =====================================================
-- 1. FUNCIÓN: GET AVAILABLE DELIVERIES
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
        COALESCE(s.business_name, s.name, 'Vendedor') as seller_name,
        COALESCE(s.address, 'Dirección no disponible') as seller_address,
        COALESCE(o.delivery_address, 'Dirección no especificada') as delivery_address,
        COALESCE(o.total_amount, o.total, 0.00) as total,
        COALESCE(o.estimated_time, 30) as estimated_time,
        o.created_at,
        NULL::DECIMAL(5,2) as distance_km
    FROM public.orders o
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.status IN ('ready', 'confirmed') -- Ambos estados para máxima compatibilidad
    AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
    AND o.driver_id IS NULL
    ORDER BY o.created_at ASC;
END;
$$;

-- =====================================================
-- 2. FUNCIÓN: ASSIGN DRIVER TO ORDER
-- =====================================================

CREATE OR REPLACE FUNCTION public.assign_driver_to_order(
    p_order_id UUID,
    p_driver_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_driver_name TEXT;
    v_seller_name TEXT;
BEGIN
    -- Verificar que el usuario es repartidor activo
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = p_driver_id 
        AND role = 'repartidor'
    ) THEN
        RETURN QUERY SELECT false, 'Usuario no es repartidor'::TEXT;
        RETURN;
    END IF;

    -- Verificar que la orden existe y está disponible
    SELECT o.*, s.name AS seller_name, s.business_name 
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.id = p_order_id 
    AND o.status IN ('ready', 'confirmed')
    AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
    AND o.driver_id IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no disponible para asignación'::TEXT;
        RETURN;
    END IF;

    -- Obtener nombres para notificaciones
    SELECT name INTO v_driver_name FROM public.users WHERE id = p_driver_id;
    v_seller_name := COALESCE(v_order.business_name, v_order.seller_name, 'Vendedor');

    -- Asignar repartidor y cambiar estado
    UPDATE public.orders 
    SET 
        driver_id = p_driver_id, 
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Crear notificación para el vendedor
    INSERT INTO public.notifications (
        recipient_id,
        type,
        title,
        message,
        data,
        created_at
    ) VALUES (
        v_order.seller_id,
        'driver_assigned',
        '🚚 Repartidor asignado',
        'El repartidor ' || COALESCE(v_driver_name, 'desconocido') || ' fue asignado a tu pedido #' || SUBSTRING(p_order_id::text, 1, 8),
        jsonb_build_object(
            'order_id', p_order_id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name
        ),
        NOW()
    );

    -- Crear notificación para el comprador si tiene buyer_id
    IF v_order.buyer_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            recipient_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            v_order.buyer_id,
            'driver_assigned',
            '🚚 Repartidor en camino',
            'Tu pedido de ' || v_seller_name || ' fue asignado a un repartidor',
            jsonb_build_object(
                'order_id', p_order_id,
                'driver_id', p_driver_id,
                'driver_name', v_driver_name
            ),
            NOW()
        );
    END IF;

    RETURN QUERY SELECT true, 'Entrega asignada exitosamente'::TEXT;
END;
$$;

-- =====================================================
-- 3. FUNCIÓN: UPDATE ORDER STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    order_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_can_update BOOLEAN := false;
BEGIN
    -- Obtener información de la orden
    SELECT o.*, 
           bu.name AS buyer_name,
           se.name AS seller_name,
           se.business_name AS seller_business
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users bu ON o.buyer_id = bu.id
    LEFT JOIN public.users se ON o.seller_id = se.id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Verificar permisos según el nuevo estado
    IF p_new_status IN ('picked-up', 'in-transit', 'delivered') THEN
        -- Solo el repartidor asignado puede cambiar estos estados
        IF v_order.driver_id = p_user_id THEN
            v_can_update := true;
        END IF;
    ELSIF p_new_status IN ('confirmed', 'preparing', 'ready', 'cancelled') THEN
        -- Solo el vendedor puede cambiar estos estados
        IF v_order.seller_id = p_user_id THEN
            v_can_update := true;
        END IF;
    END IF;

    IF NOT v_can_update THEN
        RETURN QUERY SELECT false, 'No tienes permisos para cambiar este estado'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Actualizar el estado de la orden
    UPDATE public.orders 
    SET 
        status = p_new_status,
        updated_at = NOW(),
        picked_up_at = CASE 
            WHEN p_new_status = 'picked-up' THEN NOW() 
            ELSE picked_up_at 
        END,
        delivered_at = CASE 
            WHEN p_new_status = 'delivered' THEN NOW() 
            ELSE delivered_at 
        END
    WHERE id = p_order_id;

    -- Crear notificaciones apropiadas
    -- (Simplificado para este script - se pueden agregar más notificaciones)

    RETURN QUERY SELECT 
        true, 
        'Estado actualizado exitosamente'::TEXT,
        jsonb_build_object(
            'order_id', p_order_id,
            'new_status', p_new_status,
            'updated_at', NOW()
        );
END;
$$;

-- =====================================================
-- 4. PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_available_deliveries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_driver_to_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, UUID) TO authenticated;

-- =====================================================
-- 5. VERIFICACION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Funciones de repartidores creadas exitosamente';
    RAISE NOTICE '🔧 get_available_deliveries() - Obtener pedidos disponibles';
    RAISE NOTICE '🔧 assign_driver_to_order() - Asignar repartidor a pedido';
    RAISE NOTICE '🔧 update_order_status() - Actualizar estado de pedido';
    RAISE NOTICE '📱 Ahora los repartidores deberían ver pedidos disponibles';
END $$;
