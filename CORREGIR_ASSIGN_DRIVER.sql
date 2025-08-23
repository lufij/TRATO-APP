-- 🔧 CORREGIR FUNCIÓN assign_driver_to_order
-- Esta función tiene el error de business_name al aceptar pedidos

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
    SELECT o.*, s.name AS seller_name
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
    v_seller_name := COALESCE(v_order.seller_name, 'Vendedor');

    -- Asignar repartidor y cambiar estado
    UPDATE public.orders 
    SET 
        driver_id = p_driver_id, 
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Crear notificación para el vendedor (si existe tabla notifications)
    BEGIN
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
    EXCEPTION 
        WHEN OTHERS THEN
            -- Si la tabla notifications no existe, continuar sin error
            NULL;
    END;

    -- Crear notificación para el comprador si tiene buyer_id (si existe tabla notifications)
    IF v_order.buyer_id IS NOT NULL THEN
        BEGIN
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
        EXCEPTION 
            WHEN OTHERS THEN
                -- Si la tabla notifications no existe, continuar sin error
                NULL;
        END;
    END IF;

    RETURN QUERY SELECT true, 'Entrega asignada exitosamente'::TEXT;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.assign_driver_to_order(UUID, UUID) TO authenticated;

-- Verificar que la función funciona
SELECT 'FUNCIÓN assign_driver_to_order CORREGIDA' as resultado;
