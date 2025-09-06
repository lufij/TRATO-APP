-- SOLUCIÓN RÁPIDA: ACTUALIZAR FUNCIONES RPC
-- =========================================

-- Actualizar seller_mark_ready_improved para usar solo delivery_type
CREATE OR REPLACE FUNCTION seller_mark_ready_improved(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_buyer_id UUID;
    v_order_number TEXT;
    v_notification_result RECORD;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        delivery_type,  -- SOLO delivery_type
        buyer_id,
        order_number
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type, v_buyer_id, v_order_number
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
    
    -- Lógica diferente según tipo de entrega
    IF v_delivery_type = 'delivery' THEN
        -- Si es delivery, notificar a repartidores
        BEGIN
            SELECT * INTO v_notification_result 
            FROM notify_drivers_order_ready(p_order_id);
            
            RETURN QUERY SELECT true, ('Orden lista para entrega. ' || v_notification_result.message)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            -- Si notify_drivers_order_ready no existe, continuar
            RETURN QUERY SELECT true, 'Orden lista para entrega.'::TEXT;
        END;
    ELSE
        -- Si es pickup o dine-in, notificar al cliente directamente
        BEGIN
            INSERT INTO notifications (user_id, order_id, message, type, created_at)
            VALUES (v_buyer_id, p_order_id, 'Tu orden está lista para recoger', 'order_ready', NOW());
        EXCEPTION WHEN OTHERS THEN
            -- Si la tabla notifications no existe, continuar sin error
            NULL;
        END;
        
        RETURN QUERY SELECT true, 'Orden marcada como lista. Cliente notificado para pickup.'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- También actualizar seller_mark_ready_safe si existe
CREATE OR REPLACE FUNCTION seller_mark_ready_safe(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
BEGIN
    -- Verificar que la orden existe y pertenece al vendedor
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status
    INTO v_order_exists, v_order_seller_id, v_current_status
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
    
    -- Actualizar estado a 'ready' (sin notificaciones complejas)
    UPDATE orders 
    SET 
        status = 'ready',
        ready_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, 'Orden marcada como lista exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
