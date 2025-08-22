-- =====================================================
-- TRATO - SCRIPT LIMPIO PARA SISTEMA DE ENTREGAS REPARTIDORES
-- =====================================================
-- Version sin caracteres especiales para evitar errores

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
        COALESCE(s.address, 'Direccion no disponible') as seller_address,
        o.delivery_address,
        o.total,
        COALESCE(o.estimated_time, 30) as estimated_time,
        o.created_at,
        NULL::DECIMAL(5,2) as distance_km
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
        AND COALESCE(is_active, false) = true 
        AND COALESCE(is_verified, false) = true
    ) THEN
        RETURN QUERY SELECT false, 'Usuario no es repartidor activo'::TEXT;
        RETURN;
    END IF;

    -- Verificar que la orden existe y esta disponible
    SELECT o.*, s.name AS seller_name, s.business_name 
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users s ON o.seller_id = s.id
    WHERE o.id = p_order_id 
    AND o.status = 'ready' 
    AND COALESCE(o.delivery_type, 'delivery') = 'delivery'
    AND o.driver_id IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no disponible para asignacion'::TEXT;
        RETURN;
    END IF;

    -- Obtener informacion del repartidor
    SELECT name INTO v_driver_name FROM public.users WHERE id = p_driver_id;
    v_seller_name := COALESCE(v_order.business_name, v_order.seller_name);

    -- Asignar repartidor y cambiar estado
    UPDATE public.orders 
    SET 
        driver_id = p_driver_id, 
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_order_id;

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
    -- Obtener informacion de la orden
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

    -- Verificar permisos segun el nuevo estado
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
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END
    WHERE id = p_order_id;

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
-- 5. VERIFICAR Y AGREGAR COLUMNAS NECESARIAS
-- =====================================================

-- Agregar columnas necesarias si no existen
DO $$ 
BEGIN
    -- Columna driver_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'driver_id') THEN
        ALTER TABLE public.orders ADD COLUMN driver_id UUID;
    END IF;

    -- Columna delivery_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type TEXT DEFAULT 'delivery';
    END IF;

    -- Columna delivery_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
    END IF;

    -- Columna estimated_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'estimated_time') THEN
        ALTER TABLE public.orders ADD COLUMN estimated_time INTEGER DEFAULT 30;
    END IF;

    -- Columna picked_up_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'picked_up_at') THEN
        ALTER TABLE public.orders ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Columna delivered_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =====================================================
-- 6. AGREGAR COLUMNAS PARA REPARTIDORES SI NO EXISTEN
-- =====================================================

DO $$ 
BEGIN
    -- Columna is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT false;
    END IF;

    -- Columna is_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_verified') THEN
        ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;

    -- Columna vehicle_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'vehicle_type') THEN
        ALTER TABLE public.users ADD COLUMN vehicle_type TEXT;
    END IF;

    -- Columna license_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'license_number') THEN
        ALTER TABLE public.users ADD COLUMN license_number TEXT;
    END IF;
END $$;

COMMIT;

-- Verificacion final
SELECT 'Sistema de entregas para repartidores configurado exitosamente' as status;
