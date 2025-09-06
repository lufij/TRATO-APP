-- SOLUCIÓN PARA REPARTIDORES: FUNCIONES MARCAR RECOGIDO
-- ======================================================

-- Función driver_mark_picked_up (versión completa)
CREATE OR REPLACE FUNCTION driver_mark_picked_up(
    p_order_id UUID,
    p_driver_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_driver_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_buyer_id UUID;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        driver_id,
        status,
        delivery_type,
        buyer_id
    INTO v_order_exists, v_order_driver_id, v_current_status, v_delivery_type, v_buyer_id
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_driver_id != p_driver_id THEN
        RETURN QUERY SELECT false, 'Esta orden no está asignada a ti'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'assigned' THEN
        RETURN QUERY SELECT false, ('La orden debe estar asignada. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    IF v_delivery_type != 'delivery' THEN
        RETURN QUERY SELECT false, 'Esta función solo es para órdenes delivery'::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'picked_up'
    UPDATE orders 
    SET 
        status = 'picked_up',
        picked_up_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Notificar al cliente
    BEGIN
        INSERT INTO notifications (user_id, order_id, message, type, created_at)
        VALUES (v_buyer_id, p_order_id, 'Tu pedido ha sido recogido y está en camino', 'order_picked_up', NOW());
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Continuar sin error si no existe la tabla
    END;
    
    RETURN QUERY SELECT true, 'Pedido marcado como recogido exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función driver_mark_picked_up_safe (versión simplificada)
CREATE OR REPLACE FUNCTION driver_mark_picked_up_safe(
    p_order_id UUID,
    p_driver_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_driver_id UUID;
    v_current_status TEXT;
BEGIN
    -- Verificar orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        driver_id,
        status
    INTO v_order_exists, v_order_driver_id, v_current_status
    FROM orders 
    WHERE id = p_order_id;
    
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_driver_id != p_driver_id THEN
        RETURN QUERY SELECT false, 'Orden no asignada a ti'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'assigned' THEN
        RETURN QUERY SELECT false, 'La orden debe estar asignada'::TEXT;
        RETURN;
    END IF;
    
    -- SOLO actualizar estado
    UPDATE orders 
    SET 
        status = 'picked_up',
        picked_up_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, 'Pedido recogido'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función driver_mark_picked_up_basic (versión ultra simple)
CREATE OR REPLACE FUNCTION driver_mark_picked_up_basic(
    p_order_id UUID,
    p_driver_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
    -- Verificación mínima y actualización directa
    IF EXISTS(SELECT 1 FROM orders WHERE id = p_order_id AND driver_id = p_driver_id AND status = 'assigned') THEN
        UPDATE orders 
        SET status = 'picked_up', picked_up_at = NOW(), updated_at = NOW() 
        WHERE id = p_order_id;
        
        RETURN QUERY SELECT true, 'Recogido exitosamente'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'Orden no válida para recoger'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error básico: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN ADICIONAL: driver_update_order_status (genérica para todos los estados)
CREATE OR REPLACE FUNCTION driver_update_order_status(
    p_order_id UUID,
    p_driver_id UUID,
    p_new_status TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_driver_id UUID;
    v_current_status TEXT;
    v_message TEXT;
BEGIN
    -- Verificar orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        driver_id,
        status
    INTO v_order_exists, v_order_driver_id, v_current_status
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones básicas
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_driver_id != p_driver_id THEN
        RETURN QUERY SELECT false, 'Orden no asignada a ti'::TEXT;
        RETURN;
    END IF;
    
    -- Validar transiciones de estado permitidas
    CASE v_current_status
        WHEN 'assigned' THEN
            IF p_new_status NOT IN ('picked_up') THEN
                RETURN QUERY SELECT false, 'Solo puedes marcar como recogido desde asignado'::TEXT;
                RETURN;
            END IF;
        WHEN 'picked_up' THEN
            IF p_new_status NOT IN ('in_transit') THEN
                RETURN QUERY SELECT false, 'Solo puedes marcar en camino desde recogido'::TEXT;
                RETURN;
            END IF;
        WHEN 'in_transit' THEN
            IF p_new_status NOT IN ('delivered') THEN
                RETURN QUERY SELECT false, 'Solo puedes marcar entregado desde en camino'::TEXT;
                RETURN;
            END IF;
        ELSE
            RETURN QUERY SELECT false, ('Estado actual no permite cambios: ' || v_current_status)::TEXT;
            RETURN;
    END CASE;
    
    -- Actualizar estado con campos específicos
    CASE p_new_status
        WHEN 'picked_up' THEN
            UPDATE orders SET status = 'picked_up', picked_up_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
            v_message := 'Pedido marcado como recogido';
        WHEN 'in_transit' THEN
            UPDATE orders SET status = 'in_transit', updated_at = NOW() WHERE id = p_order_id;
            v_message := 'Pedido en camino al cliente';
        WHEN 'delivered' THEN
            UPDATE orders SET status = 'delivered', delivered_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
            v_message := 'Pedido entregado exitosamente';
        ELSE
            RETURN QUERY SELECT false, 'Estado no válido'::TEXT;
            RETURN;
    END CASE;
    
    RETURN QUERY SELECT true, v_message::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
