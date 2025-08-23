-- 🚚 CREAR FUNCIÓN update_order_status COMPLETA
-- Función para que repartidores actualicen estados de órdenes

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
    v_user_role TEXT;
BEGIN
    -- Obtener información de la orden y usuario
    SELECT o.*, 
           bu.name AS buyer_name,
           se.name AS seller_name
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users bu ON o.buyer_id = bu.id
    LEFT JOIN public.users se ON o.seller_id = se.id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Obtener rol del usuario
    SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;

    -- Verificar permisos según el nuevo estado y rol
    IF p_new_status IN ('picked-up', 'picked_up', 'in-transit', 'in_transit', 'delivered') THEN
        -- Solo el repartidor asignado puede cambiar estos estados
        IF v_order.driver_id = p_user_id AND v_user_role = 'repartidor' THEN
            v_can_update := true;
        END IF;
    ELSIF p_new_status IN ('confirmed', 'preparing', 'ready', 'cancelled') THEN
        -- Solo el vendedor puede cambiar estos estados
        IF v_order.seller_id = p_user_id AND v_user_role = 'seller' THEN
            v_can_update := true;
        END IF;
    END IF;

    IF NOT v_can_update THEN
        RETURN QUERY SELECT false, 'No tienes permisos para cambiar este estado'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Actualizar el estado de la orden con timestamps
    UPDATE public.orders 
    SET 
        status = p_new_status,
        updated_at = NOW(),
        picked_up_at = CASE 
            WHEN p_new_status IN ('picked-up', 'picked_up') THEN NOW() 
            ELSE picked_up_at 
        END,
        delivered_at = CASE 
            WHEN p_new_status = 'delivered' THEN NOW() 
            ELSE delivered_at 
        END
    WHERE id = p_order_id;

    -- Crear notificaciones para vendedor y comprador
    BEGIN
        -- Notificación para el vendedor
        INSERT INTO public.notifications (
            recipient_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            v_order.seller_id,
            'order_status_update',
            CASE 
                WHEN p_new_status = 'picked-up' THEN '📦 Pedido recogido'
                WHEN p_new_status = 'in-transit' THEN '🚚 Pedido en camino'
                WHEN p_new_status = 'delivered' THEN '✅ Pedido entregado'
                ELSE 'Estado actualizado'
            END,
            CASE 
                WHEN p_new_status = 'picked-up' THEN 'El repartidor recogió el pedido #' || SUBSTRING(p_order_id::text, 1, 8)
                WHEN p_new_status = 'in-transit' THEN 'El pedido #' || SUBSTRING(p_order_id::text, 1, 8) || ' está en camino al cliente'
                WHEN p_new_status = 'delivered' THEN 'El pedido #' || SUBSTRING(p_order_id::text, 1, 8) || ' fue entregado exitosamente'
                ELSE 'El estado del pedido cambió a: ' || p_new_status
            END,
            jsonb_build_object(
                'order_id', p_order_id,
                'new_status', p_new_status,
                'driver_id', p_user_id
            ),
            NOW()
        );

        -- Notificación para el comprador (si existe)
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
                'delivery_update',
                CASE 
                    WHEN p_new_status = 'picked-up' THEN '📦 Tu pedido fue recogido'
                    WHEN p_new_status = 'in-transit' THEN '🚚 Tu pedido está en camino'
                    WHEN p_new_status = 'delivered' THEN '✅ Tu pedido fue entregado'
                    ELSE 'Actualización de tu pedido'
                END,
                CASE 
                    WHEN p_new_status = 'picked-up' THEN 'El repartidor recogió tu pedido y está preparándose para la entrega'
                    WHEN p_new_status = 'in-transit' THEN 'Tu pedido está en camino. ¡Llegará pronto!'
                    WHEN p_new_status = 'delivered' THEN '¡Tu pedido fue entregado exitosamente!'
                    ELSE 'El estado de tu pedido cambió a: ' || p_new_status
                END,
                jsonb_build_object(
                    'order_id', p_order_id,
                    'new_status', p_new_status,
                    'seller_name', v_order.seller_name
                ),
                NOW()
            );
        END IF;

    EXCEPTION 
        WHEN OTHERS THEN
            -- Si la tabla notifications no existe, continuar sin error
            NULL;
    END;

    RETURN QUERY SELECT 
        true, 
        CASE 
            WHEN p_new_status = 'picked-up' THEN 'Pedido marcado como recogido'
            WHEN p_new_status = 'in-transit' THEN 'Pedido marcado como en camino'
            WHEN p_new_status = 'delivered' THEN 'Entrega completada exitosamente'
            ELSE 'Estado actualizado exitosamente'
        END::TEXT,
        jsonb_build_object(
            'order_id', p_order_id,
            'new_status', p_new_status,
            'updated_at', NOW()
        );
END;
$$;

-- =====================================================
-- AGREGAR COLUMNAS NECESARIAS A ORDERS SI NO EXISTEN
-- =====================================================

DO $$
BEGIN
    -- Columna picked_up_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'picked_up_at') THEN
        ALTER TABLE public.orders ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Columna picked_up_at agregada';
    END IF;

    -- Columna delivered_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Columna delivered_at agregada';
    END IF;

    -- Columna delivery_notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_notes') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_notes TEXT;
        RAISE NOTICE 'Columna delivery_notes agregada';
    END IF;

    -- Columna pickup_notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pickup_notes') THEN
        ALTER TABLE public.orders ADD COLUMN pickup_notes TEXT;
        RAISE NOTICE 'Columna pickup_notes agregada';
    END IF;

    -- Columna delivery_fee
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 10.00;
        RAISE NOTICE 'Columna delivery_fee agregada';
    END IF;
END $$;

-- =====================================================
-- OTORGAR PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, UUID) TO authenticated;

-- =====================================================
-- CREAR FUNCIÓN PARA HISTORIAL DE REPARTIDOR
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_driver_delivery_history(
    p_driver_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    order_id UUID,
    customer_name TEXT,
    delivery_address TEXT,
    total_amount DECIMAL(10,2),
    delivery_fee DECIMAL(10,2),
    status TEXT,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    business_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        COALESCE(b.name, 'Cliente') as customer_name,
        COALESCE(o.delivery_address, 'Dirección no especificada') as delivery_address,
        COALESCE(o.total_amount, o.total, 0.00) as total_amount,
        COALESCE(o.delivery_fee, 10.00) as delivery_fee,
        o.status,
        o.picked_up_at,
        o.delivered_at,
        o.created_at,
        COALESCE(s.name, 'Negocio') as business_name
    FROM public.orders o
    LEFT JOIN public.users b ON o.buyer_id = b.id
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.driver_id = p_driver_id
    AND o.status IN ('delivered', 'cancelled')
    ORDER BY o.delivered_at DESC, o.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_delivery_history(UUID, INTEGER) TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 'FUNCIONES DE REPARTIDOR CREADAS EXITOSAMENTE' as resultado;
