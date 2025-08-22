-- =====================================================
-- TRATO - SISTEMA COMPLETO DE ORDENES Y NOTIFICACIONES
-- =====================================================

BEGIN;

-- Agregar columna payment_method si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer'));
        RAISE NOTICE 'Columna payment_method agregada a orders';
    ELSE
        RAISE NOTICE 'Columna payment_method ya existe en orders';
    END IF;
END $$;

-- Agregar columna price_per_unit si no existe en order_items
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        ALTER TABLE public.order_items ADD COLUMN price_per_unit DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Columna price_per_unit agregada a order_items';
    ELSE
        RAISE NOTICE 'Columna price_per_unit ya existe en order_items';
    END IF;
END $$;

-- Agregar columna total_price si no existe en order_items
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Columna total_price agregada a order_items';
    ELSE
        RAISE NOTICE 'Columna total_price ya existe en order_items';
    END IF;
END $$;

-- =====================================================
-- FUNCION PRINCIPAL PARA CAMBIAR ESTADO DE ORDEN
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
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
    v_buyer_name TEXT;
    v_seller_name TEXT;
    v_driver_name TEXT;
    v_notification_title TEXT;
    v_notification_message TEXT;
    v_notification_type TEXT;
    v_notification_recipient UUID;
BEGIN
    -- Obtener informacion de la orden
    SELECT o.*, 
           bu.name AS buyer_name,
           bu.phone AS buyer_phone,
           se.name AS seller_name,
           se.business_name AS seller_business,
           dr.name AS driver_name
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users bu ON o.buyer_id = bu.id
    LEFT JOIN public.users se ON o.seller_id = se.id
    LEFT JOIN public.users dr ON o.driver_id = dr.id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Actualizar el estado de la orden
    UPDATE public.orders 
    SET status = p_new_status,
        updated_at = NOW(),
        accepted_at = CASE WHEN p_new_status = 'accepted' THEN NOW() ELSE accepted_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END,
        picked_up_at = CASE WHEN p_new_status = 'picked-up' THEN NOW() ELSE picked_up_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        driver_id = CASE WHEN p_new_status = 'assigned' THEN p_user_id ELSE driver_id END,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_notes ELSE rejection_reason END
    WHERE id = p_order_id;

    -- Actualizar variables despues de la actualizacion
    v_buyer_name := v_order.buyer_name;
    v_seller_name := COALESCE(v_order.seller_business, v_order.seller_name);
    v_driver_name := COALESCE((SELECT name FROM public.users WHERE id = p_user_id AND role = 'repartidor'), v_order.driver_name);

    -- Crear notificaciones segun el nuevo estado
    CASE p_new_status
        WHEN 'accepted' THEN
            v_notification_recipient := v_order.buyer_id;
            v_notification_type := 'order_accepted';
            v_notification_title := 'Pedido aceptado';
            v_notification_message := v_seller_name || ' ha aceptado tu pedido. Tiempo estimado: ' || v_order.estimated_time || ' minutos.';

        WHEN 'rejected' THEN
            v_notification_recipient := v_order.buyer_id;
            v_notification_type := 'order_rejected';
            v_notification_title := 'Pedido rechazado';
            v_notification_message := 'Lo sentimos, ' || v_seller_name || ' no puede procesar tu pedido en este momento.' || 
                                    CASE WHEN p_notes IS NOT NULL THEN ' Razon: ' || p_notes ELSE '' END;

        WHEN 'ready' THEN
            v_notification_recipient := v_order.buyer_id;
            v_notification_type := 'order_ready';
            IF v_order.delivery_type = 'pickup' THEN
                v_notification_title := 'Pedido listo para recoger';
                v_notification_message := 'Tu pedido esta listo. Puedes recogerlo en ' || v_seller_name || '.';
            ELSIF v_order.delivery_type = 'dine-in' THEN
                v_notification_title := 'Pedido listo';
                v_notification_message := 'Tu pedido esta listo. Te estamos esperando en ' || v_seller_name || '.';
            ELSE
                v_notification_title := 'Pedido listo para entrega';
                v_notification_message := 'Tu pedido esta listo. Buscando repartidor disponible...';
                
                -- Si es delivery, tambien notificar a repartidores
                INSERT INTO public.notifications (recipient_id, type, title, message, data)
                SELECT u.id, 'delivery_available', 'Nueva entrega disponible', 
                       'Hay un pedido de Q' || v_order.total || ' listo para entregar desde ' || v_seller_name || '.',
                       jsonb_build_object('order_id', p_order_id, 'seller_name', v_seller_name, 'total', v_order.total, 'delivery_address', v_order.delivery_address)
                FROM public.users u 
                WHERE u.role = 'repartidor' AND u.is_active = true;
            END IF;

        WHEN 'assigned' THEN
            -- Notificar al vendedor que un repartidor tomo el pedido
            v_notification_recipient := v_order.seller_id;
            v_notification_type := 'driver_assigned';
            v_notification_title := 'Repartidor asignado';
            v_notification_message := v_driver_name || ' ira por el pedido de ' || v_buyer_name || '.';

        WHEN 'picked-up' THEN
            -- Notificar al comprador que el pedido fue recogido
            v_notification_recipient := v_order.buyer_id;
            v_notification_type := 'order_picked_up';
            v_notification_title := 'Pedido recogido';
            v_notification_message := v_driver_name || ' ha recogido tu pedido y va en camino.';

        WHEN 'in-transit' THEN
            v_notification_recipient := v_order.buyer_id;
            v_notification_type := 'order_in_transit';
            v_notification_title := 'Pedido en camino';
            v_notification_message := 'Tu pedido va en camino con ' || v_driver_name || '. Llegara pronto!';

        WHEN 'delivered' THEN
            v_notification_recipient := v_order.buyer_id;
            v_notification_type := 'order_delivered';
            v_notification_title := 'Pedido entregado';
            v_notification_message := 'Tu pedido ha sido entregado exitosamente. Disfrutalo!';

        ELSE
            -- No crear notificacion para otros estados
            NULL;
    END CASE;

    -- Insertar la notificacion si aplica
    IF v_notification_recipient IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_notification_recipient,
            v_notification_type,
            v_notification_title,
            v_notification_message,
            jsonb_build_object(
                'order_id', p_order_id,
                'order_status', p_new_status,
                'seller_name', v_seller_name,
                'driver_name', v_driver_name,
                'buyer_name', v_buyer_name
            )
        );
    END IF;

    -- Retornar resultado exitoso
    RETURN QUERY SELECT 
        true,
        'Estado actualizado exitosamente'::TEXT,
        jsonb_build_object(
            'order_id', p_order_id,
            'new_status', p_new_status,
            'notification_sent', v_notification_recipient IS NOT NULL
        );
END;
$$;

-- =====================================================
-- FUNCION PARA ASIGNAR REPARTIDOR
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
    -- Verificar que el usuario es repartidor
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_driver_id AND role = 'repartidor') THEN
        RETURN QUERY SELECT false, 'Usuario no es repartidor'::TEXT;
        RETURN;
    END IF;

    -- Verificar que la orden existe y esta lista
    SELECT o.*, s.name AS seller_name, s.business_name 
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.id = p_order_id AND o.status = 'ready' AND o.delivery_type = 'delivery';

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no disponible para asignacion'::TEXT;
        RETURN;
    END IF;

    -- Obtener nombre del repartidor
    SELECT name INTO v_driver_name FROM public.users WHERE id = p_driver_id;
    v_seller_name := COALESCE(v_order.business_name, v_order.seller_name);

    -- Asignar repartidor y cambiar estado
    UPDATE public.orders 
    SET driver_id = p_driver_id, 
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Notificar al vendedor
    INSERT INTO public.notifications (recipient_id, type, title, message, data)
    VALUES (
        v_order.seller_id,
        'driver_assigned',
        'Repartidor asignado',
        v_driver_name || ' ira por el pedido. Preparalo para entrega.',
        jsonb_build_object(
            'order_id', p_order_id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name
        )
    );

    -- Notificar al comprador
    INSERT INTO public.notifications (recipient_id, type, title, message, data)
    VALUES (
        v_order.buyer_id,
        'driver_assigned',
        'Repartidor asignado',
        v_driver_name || ' se encargara de entregar tu pedido.',
        jsonb_build_object(
            'order_id', p_order_id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name
        )
    );

    RETURN QUERY SELECT true, 'Repartidor asignado exitosamente'::TEXT;
END;
$$;

-- =====================================================
-- FUNCION PARA OBTENER ENTREGAS DISPONIBLES
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
        o.id,
        COALESCE(u.business_name, u.name),
        u.address,
        o.delivery_address,
        o.total,
        o.estimated_time,
        o.created_at,
        NULL::DECIMAL(5,2)
    FROM public.orders o
    LEFT JOIN public.users u ON o.seller_id = u.id
    WHERE o.status = 'ready' 
    AND o.delivery_type = 'delivery'
    AND o.driver_id IS NULL
    ORDER BY o.created_at ASC;
END;
$$;

-- =====================================================
-- FUNCION PARA MARCAR NOTIFICACION COMO LEIDA
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = true 
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.update_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_driver_to_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_deliveries TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;

-- =====================================================
-- ACTIVAR RLS EN TABLAS IMPORTANTES
-- =====================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies para orders
DROP POLICY IF EXISTS "Users can view their orders" ON public.orders;
CREATE POLICY "Users can view their orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id OR 
        auth.uid() = driver_id
    );

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers and drivers can update orders" ON public.orders;
CREATE POLICY "Sellers and drivers can update orders" ON public.orders
    FOR UPDATE USING (
        auth.uid() = seller_id OR 
        auth.uid() = driver_id
    );

-- Policies para order_items
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
CREATE POLICY "Users can view order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_id AND (
                auth.uid() = o.buyer_id OR 
                auth.uid() = o.seller_id OR 
                auth.uid() = o.driver_id
            )
        )
    );

DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_id AND auth.uid() = o.buyer_id
        )
    );

-- Policies para notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR ALL USING (auth.uid() = recipient_id);

RAISE NOTICE '';
RAISE NOTICE 'SISTEMA COMPLETO DE ORDENES CONFIGURADO EXITOSAMENTE!';
RAISE NOTICE '';
RAISE NOTICE 'FUNCIONALIDADES HABILITADAS:';
RAISE NOTICE '  - Flujo completo de ordenes';
RAISE NOTICE '  - Sistema de notificaciones';
RAISE NOTICE '  - Gestion de repartidores';
RAISE NOTICE '  - Politicas de seguridad configuradas';
RAISE NOTICE '';

COMMIT;

SELECT 'Sistema completo configurado exitosamente' as status;
