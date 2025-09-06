-- ===================================================================
-- 🔧 DIAGNÓSTICO COMPLETO Y CORRECCIÓN DEL FLUJO DE ÓRDENES
-- ===================================================================

-- PARTE 1: VERIFICAR EL PROBLEMA DE LA ORDEN QUE SE RESETEA
-- =========================================================

SELECT 
    '🔍 VERIFICAR ORDEN ACTUAL' as seccion,
    id,
    order_number,
    status,
    accepted_at,
    ready_at,
    created_at,
    updated_at
FROM orders 
WHERE status IN ('pending', 'accepted', 'ready')
ORDER BY created_at DESC
LIMIT 5;

-- PARTE 2: VERIFICAR CONSTRAINT DE ESTADOS
-- =======================================

SELECT 
    '📋 CONSTRAINT DE STATUS' as seccion,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%status%' 
AND table_name = 'orders';

-- PARTE 3: VERIFICAR QUE LAS FUNCIONES REALMENTE ACTUALICEN
-- ========================================================

-- Función para cambiar estado manualmente (temporal para pruebas)
CREATE OR REPLACE FUNCTION test_order_status_change(
    p_order_id UUID,
    p_new_status TEXT
) RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
    v_old_status TEXT;
BEGIN
    -- Obtener estado actual
    SELECT status INTO v_old_status FROM orders WHERE id = p_order_id;
    
    -- Intentar actualizar
    UPDATE orders SET status = p_new_status, updated_at = NOW()
    WHERE id = p_order_id;
    
    IF FOUND THEN
        v_result := 'ÉXITO: ' || v_old_status || ' → ' || p_new_status;
    ELSE
        v_result := 'ERROR: No se encontró la orden o no se pudo actualizar';
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- PARTE 4: CREAR FUNCIONES COMPLETAS PARA TODO EL FLUJO
-- =====================================================

-- 📦 FUNCIÓN PARA MARCAR ORDEN LISTA (PICKUP/DINE-IN)
CREATE OR REPLACE FUNCTION seller_mark_completed_pickup(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
BEGIN
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        delivery_type
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type
    FROM orders 
    WHERE id = p_order_id;
    
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'ready' THEN
        RETURN QUERY SELECT false, 'La orden debe estar lista primero'::TEXT;
        RETURN;
    END IF;
    
    IF v_delivery_type NOT IN ('pickup', 'dine-in') THEN
        RETURN QUERY SELECT false, 'Esta función es solo para pickup o dine-in'::TEXT;
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
    
    -- Notificar al comprador
    INSERT INTO notifications (user_id, order_id, message, type)
    SELECT v_order_seller_id, p_order_id, 'Tu orden ha sido completada y está lista para recoger', 'order_completed';
    
    RETURN QUERY SELECT true, 'Orden completada exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🚚 FUNCIÓN PARA NOTIFICAR REPARTIDORES (DELIVERY)
CREATE OR REPLACE FUNCTION notify_drivers_order_ready(
    p_order_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_driver_count INTEGER;
BEGIN
    -- Contar repartidores disponibles
    SELECT COUNT(*) INTO v_driver_count
    FROM users 
    WHERE role = 'repartidor' AND is_active = true;
    
    IF v_driver_count = 0 THEN
        RETURN QUERY SELECT false, 'No hay repartidores disponibles'::TEXT;
        RETURN;
    END IF;
    
    -- Notificar a todos los repartidores activos
    INSERT INTO notifications (user_id, order_id, message, type)
    SELECT 
        u.id, 
        p_order_id, 
        'Nueva orden disponible para entrega', 
        'order_available'
    FROM users u 
    WHERE u.role = 'repartidor' AND u.is_active = true;
    
    RETURN QUERY SELECT true, ('Notificado a ' || v_driver_count || ' repartidores')::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🎯 FUNCIÓN MEJORADA PARA MARCAR READY (CON FLUJO COMPLETO)
CREATE OR REPLACE FUNCTION seller_mark_ready_improved(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_notification_result RECORD;
BEGIN
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        delivery_type
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type
    FROM orders 
    WHERE id = p_order_id;
    
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'accepted' THEN
        RETURN QUERY SELECT false, 'La orden debe estar aceptada primero'::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'ready'
    UPDATE orders 
    SET 
        status = 'ready',
        ready_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Si es delivery, notificar a repartidores
    IF v_delivery_type = 'delivery' THEN
        SELECT * INTO v_notification_result 
        FROM notify_drivers_order_ready(p_order_id);
        
        RETURN QUERY SELECT true, ('Orden lista. ' || v_notification_result.message)::TEXT;
    ELSE
        -- Si es pickup o dine-in, notificar al cliente
        INSERT INTO notifications (user_id, order_id, message, type)
        SELECT buyer_id, p_order_id, 'Tu orden está lista para recoger', 'order_ready'
        FROM orders WHERE id = p_order_id;
        
        RETURN QUERY SELECT true, 'Orden marcada como lista. Cliente notificado.'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OTORGAR PERMISOS
GRANT EXECUTE ON FUNCTION seller_mark_completed_pickup(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_drivers_order_ready(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seller_mark_ready_improved(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION test_order_status_change(UUID, TEXT) TO authenticated;

-- PARTE 5: VERIFICAR TODAS LAS FUNCIONES CREADAS
-- ==============================================

SELECT 
    '🔧 FUNCIONES DISPONIBLES' as seccion,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE 'seller_%' OR routine_name LIKE 'notify_%' OR routine_name = 'test_order_status_change'
AND routine_schema = 'public'
ORDER BY routine_name;
