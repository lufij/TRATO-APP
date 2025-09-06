-- VERSIÓN SEGURA - FUNCIONES SIN DEPENDENCIA DE NOTIFICATIONS
-- ============================================================
-- Ejecutar este script si hay problemas con la tabla notifications

-- 1. FUNCIÓN PARA COMPLETAR ÓRDENES PICKUP/DINE-IN (VERSIÓN SEGURA)
CREATE OR REPLACE FUNCTION seller_mark_completed_pickup_safe(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        COALESCE(delivery_type, delivery_method)
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'ready' THEN
        RETURN QUERY SELECT false, ('La orden debe estar lista primero. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    IF v_delivery_type NOT IN ('pickup', 'dine-in', 'dine_in') THEN
        RETURN QUERY SELECT false, ('Esta función es solo para pickup o dine-in. Tipo actual: ' || COALESCE(v_delivery_type, 'null'))::TEXT;
        RETURN;
    END IF;
    
    -- Marcar como completado
    UPDATE orders 
    SET 
        status = 'completed',
        delivered_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, 'Orden completada exitosamente (sin notificaciones)'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNCIÓN MEJORADA PARA MARCAR READY (VERSIÓN SEGURA)
CREATE OR REPLACE FUNCTION seller_mark_ready_safe(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_driver_count INTEGER := 0;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        COALESCE(delivery_type, delivery_method)
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'accepted' THEN
        RETURN QUERY SELECT false, ('La orden debe estar aceptada primero. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'ready'
    UPDATE orders 
    SET 
        status = 'ready',
        ready_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Mensaje diferente según tipo de entrega
    IF v_delivery_type = 'delivery' THEN
        -- Contar repartidores disponibles
        BEGIN
            SELECT COUNT(*) INTO v_driver_count
            FROM users 
            WHERE role = 'repartidor' AND COALESCE(is_active, true) = true;
        EXCEPTION WHEN OTHERS THEN
            v_driver_count := 0;
        END;
        
        RETURN QUERY SELECT true, ('Orden lista para entrega. ' || v_driver_count || ' repartidores disponibles (sin notificaciones automáticas)')::TEXT;
    ELSE
        RETURN QUERY SELECT true, 'Orden marcada como lista para pickup/dine-in (sin notificaciones automáticas)'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. OTORGAR PERMISOS PARA LAS VERSIONES SEGURAS
GRANT EXECUTE ON FUNCTION seller_mark_completed_pickup_safe(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seller_mark_ready_safe(UUID, UUID) TO authenticated;

-- 4. VERIFICAR COLUMNAS EXISTENTES EN ORDERS
SELECT 
    'Columnas de orders' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND column_name IN ('delivery_type', 'delivery_method', 'completed_at', 'delivered_at', 'ready_at', 'accepted_at')
ORDER BY column_name;

-- 5. VERIFICAR FUNCIONES CREADAS
SELECT 
    'Funciones creadas' as info,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('seller_mark_ready_safe', 'seller_mark_completed_pickup_safe')
AND routine_schema = 'public';

-- 6. CREAR COLUMNAS FALTANTES EN ORDERS SI ES NECESARIO
DO $$ 
BEGIN 
    -- Agregar completed_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Agregar delivered_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Agregar ready_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ready_at') THEN
        ALTER TABLE orders ADD COLUMN ready_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Agregar accepted_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'accepted_at') THEN
        ALTER TABLE orders ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END 
$$;
