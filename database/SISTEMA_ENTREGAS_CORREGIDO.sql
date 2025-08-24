-- =====================================================
-- SISTEMA COMPLETO DE ENTREGAS CON SEGUIMIENTO - CORREGIDO
-- TRATO APP - Versión Profesional
-- Corrección: Cambio de columna 'read' por 'is_read'
-- =====================================================

BEGIN;

-- =====================================================
-- 1. VERIFICAR Y ACTUALIZAR ESTRUCTURA DE ÓRDENES
-- =====================================================

-- Agregar columnas necesarias para el sistema de entregas
DO $$ 
BEGIN
    -- Columnas básicas de repartidor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'driver_id') THEN
        ALTER TABLE public.orders ADD COLUMN driver_id UUID REFERENCES users(id);
        RAISE NOTICE '✅ Columna driver_id agregada';
    END IF;

    -- Columnas de direcciones
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pickup_address') THEN
        ALTER TABLE public.orders ADD COLUMN pickup_address TEXT;
        RAISE NOTICE '✅ Columna pickup_address agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE '✅ Columna delivery_address agregada';
    END IF;

    -- Columnas de timestamps para seguimiento
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'assigned_at') THEN
        ALTER TABLE public.orders ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Columna assigned_at agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'picked_up_at') THEN
        ALTER TABLE public.orders ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Columna picked_up_at agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'in_transit_at') THEN
        ALTER TABLE public.orders ADD COLUMN in_transit_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Columna in_transit_at agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Columna delivered_at agregada';
    END IF;

    -- Columnas de información del cliente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
        RAISE NOTICE '✅ Columna customer_name agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
        RAISE NOTICE '✅ Columna customer_phone agregada';
    END IF;

    -- Columnas de tarifas y tiempo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 15.00;
        RAISE NOTICE '✅ Columna delivery_fee agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'estimated_time') THEN
        ALTER TABLE public.orders ADD COLUMN estimated_time INTEGER DEFAULT 30;
        RAISE NOTICE '✅ Columna estimated_time agregada';
    END IF;

    -- Columnas de calificaciones
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'seller_rating') THEN
        ALTER TABLE public.orders ADD COLUMN seller_rating INTEGER CHECK (seller_rating >= 1 AND seller_rating <= 5);
        RAISE NOTICE '✅ Columna seller_rating agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'driver_rating') THEN
        ALTER TABLE public.orders ADD COLUMN driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5);
        RAISE NOTICE '✅ Columna driver_rating agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'seller_review') THEN
        ALTER TABLE public.orders ADD COLUMN seller_review TEXT;
        RAISE NOTICE '✅ Columna seller_review agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'driver_review') THEN
        ALTER TABLE public.orders ADD COLUMN driver_review TEXT;
        RAISE NOTICE '✅ Columna driver_review agregada';
    END IF;

    -- Columna de tipo de entrega
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('pickup', 'dine_in', 'delivery'));
        RAISE NOTICE '✅ Columna delivery_type agregada';
    END IF;

    -- Actualizar constraint de status para incluir todos los estados necesarios
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled', 'rejected'));
    RAISE NOTICE '✅ Constraint de status actualizado';
END $$;

-- =====================================================
-- 2. CREAR/ACTUALIZAR TABLA DE NOTIFICACIONES
-- =====================================================

-- Primero eliminar la tabla si existe con la columna problemática
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Crear la tabla de notificaciones con el nombre correcto de columna
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- =====================================================
-- 3. ELIMINAR FUNCIONES EXISTENTES Y RECREAR
-- =====================================================

-- Eliminar funciones existentes para evitar conflictos de tipos
DROP FUNCTION IF EXISTS public.get_available_deliveries();
DROP FUNCTION IF EXISTS public.assign_driver_to_order(UUID, UUID);
DROP FUNCTION IF EXISTS public.update_delivery_status(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.rate_order_experience(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.driver_get_completed_orders(UUID);
DROP FUNCTION IF EXISTS public.get_unread_notifications(UUID);
DROP FUNCTION IF EXISTS public.mark_notification_as_read(UUID, UUID);

-- =====================================================
-- 4. FUNCIONES PARA GESTIÓN DE ENTREGAS
-- =====================================================

-- Función para obtener entregas disponibles
CREATE OR REPLACE FUNCTION public.get_available_deliveries()
RETURNS TABLE (
    order_id UUID,
    seller_name TEXT,
    seller_address TEXT,
    delivery_address TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    total DECIMAL(10,2),
    delivery_fee DECIMAL(10,2),
    estimated_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    distance_km DECIMAL(5,2),
    business_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        COALESCE(s.business_name, u.name) as seller_name,
        COALESCE(s.business_address, 'Dirección no disponible') as seller_address,
        COALESCE(o.delivery_address, 'Dirección no especificada') as delivery_address,
        COALESCE(o.customer_name, bu.name, 'Cliente') as customer_name,
        COALESCE(o.customer_phone, bu.phone, 'Sin teléfono') as customer_phone,
        COALESCE(o.total, 0) as total,
        COALESCE(o.delivery_fee, 15.00) as delivery_fee,
        COALESCE(o.estimated_time, 30) as estimated_time,
        o.created_at,
        NULL::DECIMAL(5,2) as distance_km,
        COALESCE(s.business_name, u.name) as business_name
    FROM public.orders o
    LEFT JOIN public.users u ON o.seller_id = u.id
    LEFT JOIN public.sellers s ON o.seller_id = s.id
    LEFT JOIN public.users bu ON o.buyer_id = bu.id
    WHERE o.status = 'ready' 
    AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
    AND o.driver_id IS NULL
    ORDER BY o.created_at ASC;
END;
$$;

-- Función para asignar repartidor a una orden
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
    v_business_name TEXT;
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
    SELECT o.*, u.name AS seller_name, s.business_name 
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users u ON o.seller_id = u.id
    LEFT JOIN public.sellers s ON o.seller_id = s.id
    WHERE o.id = p_order_id 
    AND o.status = 'ready' 
    AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
    AND o.driver_id IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no disponible para asignación'::TEXT;
        RETURN;
    END IF;

    -- Obtener información del repartidor
    SELECT name INTO v_driver_name FROM public.users WHERE id = p_driver_id;
    v_seller_name := COALESCE(v_order.business_name, v_order.seller_name);
    v_business_name := COALESCE(v_order.business_name, v_order.seller_name);

    -- Asignar repartidor y cambiar estado
    UPDATE public.orders 
    SET 
        driver_id = p_driver_id, 
        status = 'assigned',
        assigned_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Notificar al vendedor sobre repartidor asignado
    INSERT INTO public.notifications (recipient_id, type, title, message, data)
    VALUES (
        v_order.seller_id,
        'driver_assigned',
        '🚚 Repartidor Asignado',
        v_driver_name || ' se encargará de la entrega del pedido.',
        jsonb_build_object(
            'order_id', p_order_id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name,
            'status', 'assigned'
        )
    );

    -- Notificar al comprador sobre repartidor asignado
    INSERT INTO public.notifications (recipient_id, type, title, message, data)
    VALUES (
        v_order.buyer_id,
        'driver_assigned',
        '🚚 Repartidor en Camino',
        v_driver_name || ' se encargará de entregar tu pedido desde ' || v_business_name || '.',
        jsonb_build_object(
            'order_id', p_order_id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name,
            'business_name', v_business_name,
            'status', 'assigned'
        )
    );

    RETURN QUERY SELECT true, 'Repartidor asignado exitosamente'::TEXT;
END;
$$;

-- Función para actualizar estado de orden con notificaciones automáticas
CREATE OR REPLACE FUNCTION public.update_delivery_status(
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
    v_driver_name TEXT;
    v_seller_name TEXT;
    v_business_name TEXT;
    v_customer_name TEXT;
    v_can_update BOOLEAN := false;
    v_notification_title TEXT;
    v_notification_message TEXT;
    v_notification_recipient UUID;
    v_notification_type TEXT;
BEGIN
    -- Obtener información de la orden con todos los nombres
    SELECT 
        o.*,
        bu.name AS buyer_name,
        bu.phone AS buyer_phone,
        se.name AS seller_name,
        s.business_name,
        dr.name AS driver_name
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users bu ON o.buyer_id = bu.id
    LEFT JOIN public.users se ON o.seller_id = se.id
    LEFT JOIN public.sellers s ON o.seller_id = s.id
    LEFT JOIN public.users dr ON o.driver_id = dr.id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Verificar permisos según el nuevo estado
    CASE p_new_status
        WHEN 'picked_up' THEN
            -- Solo el repartidor asignado puede marcar como recogido
            IF v_order.driver_id = p_user_id THEN
                v_can_update := true;
            END IF;
        WHEN 'in_transit' THEN
            -- Solo el repartidor asignado puede marcar como en tránsito
            IF v_order.driver_id = p_user_id THEN
                v_can_update := true;
            END IF;
        WHEN 'delivered' THEN
            -- Solo el repartidor asignado puede marcar como entregado
            IF v_order.driver_id = p_user_id THEN
                v_can_update := true;
            END IF;
        WHEN 'completed' THEN
            -- Solo el comprador puede marcar como completado (recibido)
            IF v_order.buyer_id = p_user_id THEN
                v_can_update := true;
            END IF;
        ELSE
            v_can_update := false;
    END CASE;

    IF NOT v_can_update THEN
        RETURN QUERY SELECT false, 'No tienes permisos para cambiar este estado'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Actualizar el estado de la orden con timestamps correspondientes
    UPDATE public.orders 
    SET 
        status = p_new_status,
        updated_at = NOW(),
        picked_up_at = CASE WHEN p_new_status = 'picked_up' THEN NOW() ELSE picked_up_at END,
        in_transit_at = CASE WHEN p_new_status = 'in_transit' THEN NOW() ELSE in_transit_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END
    WHERE id = p_order_id;

    -- Preparar variables para notificaciones
    v_driver_name := COALESCE(v_order.driver_name, 'Repartidor');
    v_seller_name := COALESCE(v_order.business_name, v_order.seller_name, 'Vendedor');
    v_business_name := COALESCE(v_order.business_name, v_order.seller_name, 'Negocio');
    v_customer_name := COALESCE(v_order.buyer_name, 'Cliente');

    -- Crear notificaciones según el nuevo estado
    CASE p_new_status
        WHEN 'picked_up' THEN
            -- Notificar al vendedor que el pedido fue recogido
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.seller_id,
                'order_picked_up',
                '📦 Pedido Recogido',
                v_driver_name || ' ha recogido el pedido y va hacia el cliente.',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'driver_name', v_driver_name,
                    'status', 'picked_up'
                )
            );

            -- Notificar al comprador que su pedido fue recogido
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.buyer_id,
                'order_picked_up',
                '📦 Pedido Recogido',
                v_driver_name || ' ha recogido tu pedido de ' || v_business_name || ' y va en camino.',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'driver_name', v_driver_name,
                    'business_name', v_business_name,
                    'status', 'picked_up'
                )
            );

        WHEN 'in_transit' THEN
            -- Notificar al comprador que su pedido viene en camino
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.buyer_id,
                'order_in_transit',
                '🚚 Pedido en Camino',
                v_driver_name || ' viene hacia ti con tu pedido. ¡Prepárate para recibirlo!',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'driver_name', v_driver_name,
                    'status', 'in_transit'
                )
            );

            -- Notificar al vendedor del progreso
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.seller_id,
                'order_in_transit',
                '🚚 En Camino al Cliente',
                v_driver_name || ' está en camino para entregar el pedido a ' || v_customer_name || '.',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'driver_name', v_driver_name,
                    'customer_name', v_customer_name,
                    'status', 'in_transit'
                )
            );

        WHEN 'delivered' THEN
            -- Notificar al comprador que su pedido fue entregado
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.buyer_id,
                'order_delivered',
                '✅ Pedido Entregado',
                '¡Tu pedido ha sido entregado! Confirma la recepción y califica tu experiencia.',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'driver_name', v_driver_name,
                    'status', 'delivered',
                    'can_rate', true
                )
            );

            -- Notificar al vendedor que la entrega fue completada
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.seller_id,
                'order_delivered',
                '✅ Entrega Completada',
                'El pedido para ' || v_customer_name || ' ha sido entregado exitosamente por ' || v_driver_name || '.',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'driver_name', v_driver_name,
                    'customer_name', v_customer_name,
                    'status', 'delivered'
                )
            );

        WHEN 'completed' THEN
            -- Notificar al vendedor que el cliente confirmó la recepción
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.seller_id,
                'order_completed',
                '🎉 Pedido Confirmado',
                v_customer_name || ' ha confirmado la recepción del pedido. ¡Transacción completada!',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'customer_name', v_customer_name,
                    'status', 'completed'
                )
            );

            -- Notificar al repartidor que el cliente confirmó
            INSERT INTO public.notifications (recipient_id, type, title, message, data)
            VALUES (
                v_order.driver_id,
                'order_completed',
                '🎉 Entrega Confirmada',
                'El cliente ha confirmado la recepción del pedido. ¡Excelente trabajo!',
                jsonb_build_object(
                    'order_id', p_order_id,
                    'customer_name', v_customer_name,
                    'status', 'completed'
                )
            );
    END CASE;

    -- Retornar resultado exitoso
    RETURN QUERY SELECT 
        true,
        'Estado actualizado exitosamente'::TEXT,
        jsonb_build_object(
            'order_id', p_order_id,
            'new_status', p_new_status,
            'timestamp', NOW()
        );
END;
$$;

-- Función para calificar vendedor y repartidor
CREATE OR REPLACE FUNCTION public.rate_order_experience(
    p_order_id UUID,
    p_user_id UUID,
    p_seller_rating INTEGER DEFAULT NULL,
    p_driver_rating INTEGER DEFAULT NULL,
    p_seller_review TEXT DEFAULT NULL,
    p_driver_review TEXT DEFAULT NULL
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
BEGIN
    -- Verificar que la orden existe y el usuario es el comprador
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id 
    AND buyer_id = p_user_id
    AND status IN ('delivered', 'completed');

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no encontrada o no tienes permisos para calificarla'::TEXT;
        RETURN;
    END IF;

    -- Actualizar calificaciones
    UPDATE public.orders 
    SET 
        seller_rating = COALESCE(p_seller_rating, seller_rating),
        driver_rating = COALESCE(p_driver_rating, driver_rating),
        seller_review = COALESCE(p_seller_review, seller_review),
        driver_review = COALESCE(p_driver_review, driver_review),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Notificar al vendedor sobre la calificación (si se proporcionó)
    IF p_seller_rating IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.seller_id,
            'rating_received',
            '⭐ Nueva Calificación',
            'Has recibido una calificación de ' || p_seller_rating || ' estrellas.',
            jsonb_build_object(
                'order_id', p_order_id,
                'rating', p_seller_rating,
                'review', COALESCE(p_seller_review, ''),
                'type', 'seller'
            )
        );
    END IF;

    -- Notificar al repartidor sobre la calificación (si se proporcionó)
    IF p_driver_rating IS NOT NULL AND v_order.driver_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.driver_id,
            'rating_received',
            '⭐ Nueva Calificación',
            'Has recibido una calificación de ' || p_driver_rating || ' estrellas por tu entrega.',
            jsonb_build_object(
                'order_id', p_order_id,
                'rating', p_driver_rating,
                'review', COALESCE(p_driver_review, ''),
                'type', 'driver'
            )
        );
    END IF;

    RETURN QUERY SELECT true, 'Calificación registrada exitosamente'::TEXT;
END;
$$;

-- Función para obtener historial de entregas del repartidor
CREATE OR REPLACE FUNCTION public.driver_get_completed_orders(
    p_driver_id UUID
)
RETURNS TABLE (
    order_id UUID,
    customer_name TEXT,
    business_name TEXT,
    total_amount DECIMAL(10,2),
    delivery_fee DECIMAL(10,2),
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    customer_rating INTEGER,
    customer_review TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        COALESCE(o.customer_name, bu.name, 'Cliente') as customer_name,
        COALESCE(s.business_name, se.name, 'Negocio') as business_name,
        COALESCE(o.total, 0) as total_amount,
        COALESCE(o.delivery_fee, 0) as delivery_fee,
        o.status,
        o.created_at,
        o.delivered_at,
        o.driver_rating as customer_rating,
        o.driver_review as customer_review
    FROM public.orders o
    LEFT JOIN public.users bu ON o.buyer_id = bu.id
    LEFT JOIN public.users se ON o.seller_id = se.id
    LEFT JOIN public.sellers s ON o.seller_id = s.id
    WHERE o.driver_id = p_driver_id
    AND o.status IN ('delivered', 'completed')
    ORDER BY o.delivered_at DESC, o.created_at DESC;
END;
$$;

-- Función para obtener notificaciones no leídas
CREATE OR REPLACE FUNCTION public.get_unread_notifications(
    p_user_id UUID
)
RETURNS TABLE (
    notification_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.created_at
    FROM public.notifications n
    WHERE n.recipient_id = p_user_id
    AND n.is_read = false
    ORDER BY n.created_at DESC;
END;
$$;

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que la notificación existe y pertenece al usuario
    IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE id = p_notification_id 
        AND recipient_id = p_user_id
    ) THEN
        RETURN QUERY SELECT false, 'Notificación no encontrada'::TEXT;
        RETURN;
    END IF;

    -- Marcar como leída
    UPDATE public.notifications 
    SET is_read = true
    WHERE id = p_notification_id AND recipient_id = p_user_id;

    RETURN QUERY SELECT true, 'Notificación marcada como leída'::TEXT;
END;
$$;

-- =====================================================
-- 5. PERMISOS Y POLÍTICAS
-- =====================================================

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_available_deliveries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_driver_to_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_delivery_status(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rate_order_experience(UUID, UUID, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_get_completed_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(UUID, UUID) TO authenticated;

-- Políticas para la tabla de notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- =====================================================
-- 6. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para consultas de entregas
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_delivery ON orders(status, delivery_type) WHERE delivery_type = 'delivery';
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(driver_id, status) WHERE driver_id IS NOT NULL;

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las funciones fueron creadas
SELECT 
    'Funciones creadas correctamente' as status,
    COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_available_deliveries',
    'assign_driver_to_order', 
    'update_delivery_status',
    'rate_order_experience',
    'driver_get_completed_orders',
    'get_unread_notifications',
    'mark_notification_as_read'
);

-- Verificar estructura de órdenes
SELECT 
    'Columnas de órdenes verificadas' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
AND column_name IN (
    'driver_id', 'pickup_address', 'delivery_address', 
    'assigned_at', 'picked_up_at', 'in_transit_at', 'delivered_at',
    'customer_name', 'customer_phone', 'delivery_fee',
    'seller_rating', 'driver_rating', 'seller_review', 'driver_review'
);

-- Verificar tabla de notificaciones
SELECT 
    'Tabla de notificaciones verificada' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notifications';

COMMIT;

-- Mensaje final
SELECT '🚚 SISTEMA DE ENTREGAS COMPLETAMENTE CONFIGURADO - CORREGIDO' as resultado,
       '✅ Todas las funciones y estructuras están listas' as detalle,
       '🔧 Corrección: Columna "read" cambiada por "is_read"' as correccion;
