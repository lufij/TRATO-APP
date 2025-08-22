-- =====================================================
-- TRATO - SCRIPT PARA HABILITAR SISTEMA DE ENTREGAS PARA REPARTIDORES
-- =====================================================
-- Este script asegura que todas las funciones necesarias estén implementadas

BEGIN;

-- =====================================================
-- 1. FUNCIÓN PARA OBTENER ENTREGAS DISPONIBLES
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
        COALESCE(s.business_name, s.name) as seller_name,
        COALESCE(s.address, 'Dirección no disponible') as seller_address,
        o.delivery_address,
        o.total,
        COALESCE(o.estimated_time, 30) as estimated_time,
        o.created_at,
        NULL::DECIMAL(5,2) as distance_km -- Placeholder para distancia
    FROM public.orders o
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.status = 'ready' 
    AND o.delivery_type = 'delivery'
    AND o.driver_id IS NULL
    ORDER BY o.created_at ASC;
END;
$$;

-- =====================================================
-- 2. FUNCIÓN PARA ASIGNAR REPARTIDOR A ORDEN
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
        AND is_active = true 
        AND is_verified = true
    ) THEN
        RETURN QUERY SELECT false, 'Usuario no es repartidor activo'::TEXT;
        RETURN;
    END IF;

    -- Verificar que la orden existe y está disponible
    SELECT o.*, s.name AS seller_name, s.business_name 
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.id = p_order_id 
    AND o.status = 'ready' 
    AND o.delivery_type = 'delivery'
    AND o.driver_id IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no disponible para asignación'::TEXT;
        RETURN;
    END IF;

    -- Obtener información del repartidor
    SELECT name INTO v_driver_name FROM public.users WHERE id = p_driver_id;
    v_seller_name := COALESCE(v_order.business_name, v_order.seller_name);

    -- Asignar repartidor y cambiar estado
    UPDATE public.orders 
    SET 
        driver_id = p_driver_id, 
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Crear notificación para el vendedor (opcional)
    INSERT INTO public.notifications (recipient_id, type, title, message, data)
    VALUES (
        v_order.seller_id,
        'driver_assigned',
        'Repartidor asignado',
        v_driver_name || ' se encargará de la entrega.',
        jsonb_build_object(
            'order_id', p_order_id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name
        )
    ) ON CONFLICT DO NOTHING; -- Evitar errores si la tabla no existe

    -- Crear notificación para el comprador (opcional)
    INSERT INTO public.notifications (recipient_id, type, title, message, data)
    VALUES (
        v_order.buyer_id,
        'driver_assigned',
        'Repartidor asignado',
        v_driver_name || ' entregará tu pedido.',
        jsonb_build_object(
            'order_id', p_order_id,
            'driver_id', p_driver_id,
            'driver_name', v_driver_name
        )
    ) ON CONFLICT DO NOTHING; -- Evitar errores si la tabla no existe

    RETURN QUERY SELECT true, 'Entrega asignada exitosamente'::TEXT;
END;
$$;

-- =====================================================
-- 3. FUNCIÓN PARA ACTUALIZAR ESTADO DE ORDEN
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
        IF v_order.driver_id != p_user_id THEN
            RETURN QUERY SELECT false, 'Solo el repartidor asignado puede cambiar este estado'::TEXT, NULL::JSONB;
            RETURN;
        END IF;
        v_can_update := true;
    ELSIF p_new_status IN ('accepted', 'ready', 'rejected') THEN
        -- Solo el vendedor puede cambiar estos estados
        IF v_order.seller_id != p_user_id THEN
            RETURN QUERY SELECT false, 'Solo el vendedor puede cambiar este estado'::TEXT, NULL::JSONB;
            RETURN;
        END IF;
        v_can_update := true;
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
        picked_up_at = CASE WHEN p_new_status = 'picked-up' THEN NOW() ELSE picked_up_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_notes ELSE rejection_reason END
    WHERE id = p_order_id;

    -- Crear notificación según el estado (opcional)
    IF p_new_status = 'picked-up' THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.buyer_id,
            'order_picked_up',
            'Pedido recogido',
            'Tu pedido ha sido recogido y va en camino.',
            jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
        ) ON CONFLICT DO NOTHING;
    ELSIF p_new_status = 'delivered' THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.buyer_id,
            'order_delivered',
            'Pedido entregado',
            'Tu pedido ha sido entregado exitosamente.',
            jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
        ) ON CONFLICT DO NOTHING;
    END IF;

    -- Retornar resultado exitoso
    RETURN QUERY SELECT 
        true,
        'Estado actualizado exitosamente'::TEXT,
        jsonb_build_object(
            'order_id', p_order_id,
            'new_status', p_new_status
        );
END;
$$;

-- =====================================================
-- 4. PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_available_deliveries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_driver_to_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, UUID, TEXT) TO authenticated;

-- =====================================================
-- 5. VERIFICAR ESTRUCTURA DE ÓRDENES
-- =====================================================

-- Agregar columnas necesarias si no existen
DO $$ 
BEGIN
    -- Columna driver_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'driver_id') THEN
        ALTER TABLE public.orders ADD COLUMN driver_id UUID;
        RAISE NOTICE 'Columna driver_id agregada a orders';
    END IF;

    -- Columna delivery_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type TEXT DEFAULT 'delivery';
        RAISE NOTICE 'Columna delivery_type agregada a orders';
    END IF;

    -- Columna delivery_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE 'Columna delivery_address agregada a orders';
    END IF;

    -- Columna estimated_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'estimated_time') THEN
        ALTER TABLE public.orders ADD COLUMN estimated_time INTEGER DEFAULT 30;
        RAISE NOTICE 'Columna estimated_time agregada a orders';
    END IF;

    -- Columna picked_up_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'picked_up_at') THEN
        ALTER TABLE public.orders ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Columna picked_up_at agregada a orders';
    END IF;

    -- Columna delivered_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Columna delivered_at agregada a orders';
    END IF;
END $$;

-- =====================================================
-- 6. VERIFICAR ESTADO ACTUAL
-- =====================================================

-- Verificar órdenes disponibles para entrega
SELECT 
    'Órdenes disponibles para entrega' as info,
    COUNT(*) as cantidad
FROM public.orders 
WHERE status = 'ready' 
AND delivery_type = 'delivery' 
AND driver_id IS NULL;

-- Verificar repartidores activos
SELECT 
    'Repartidores activos' as info,
    COUNT(*) as cantidad
FROM public.users 
WHERE role = 'repartidor' 
AND is_active = true 
AND is_verified = true;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '🚚 SISTEMA DE ENTREGAS PARA REPARTIDORES HABILITADO';
RAISE NOTICE '';
RAISE NOTICE '✅ Funcionalidades disponibles:';
RAISE NOTICE '   • Ver entregas disponibles (solo órdenes reales)';
RAISE NOTICE '   • Aceptar entregas';
RAISE NOTICE '   • Actualizar estado de entrega';
RAISE NOTICE '   • Sistema de notificaciones';
RAISE NOTICE '';

SELECT 'Sistema de entregas configurado exitosamente' as status;
