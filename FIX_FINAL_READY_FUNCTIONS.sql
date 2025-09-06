-- SOLUCIÓN FINAL: FUNCIONES SIN ORDER_NUMBER
-- =============================================

-- Función seller_mark_ready_improved SIN order_number
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
    v_notification_result RECORD;
BEGIN
    -- Obtener información de la orden (SIN order_number)
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        delivery_type,
        buyer_id
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type, v_buyer_id
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
    
    -- Lógica según tipo de entrega
    IF v_delivery_type = 'delivery' THEN
        -- Si es delivery, notificar a repartidores
        BEGIN
            SELECT * INTO v_notification_result 
            FROM notify_drivers_order_ready(p_order_id);
            
            RETURN QUERY SELECT true, ('Orden lista para entrega. ' || v_notification_result.message)::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT true, 'Orden lista para entrega.'::TEXT;
        END;
    ELSE
        -- Si es pickup o dine-in, notificar al cliente
        BEGIN
            INSERT INTO notifications (user_id, order_id, message, type, created_at)
            VALUES (v_buyer_id, p_order_id, 'Tu orden está lista para recoger', 'order_ready', NOW());
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Continuar sin error si no existe la tabla
        END;
        
        RETURN QUERY SELECT true, 'Orden lista para pickup/dine-in.'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función seller_mark_ready_safe SIMPLIFICADA
CREATE OR REPLACE FUNCTION seller_mark_ready_safe(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
BEGIN
    -- Verificar orden (SIN order_number)
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
    
    -- SOLO actualizar estado
    UPDATE orders 
    SET 
        status = 'ready',
        ready_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, 'Orden marcada como lista'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función básica como respaldo final
CREATE OR REPLACE FUNCTION seller_mark_ready_basic(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
    -- Verificación mínima y actualización directa
    IF EXISTS(SELECT 1 FROM orders WHERE id = p_order_id AND seller_id = p_seller_id AND status = 'accepted') THEN
        UPDATE orders 
        SET status = 'ready', ready_at = NOW(), updated_at = NOW() 
        WHERE id = p_order_id;
        
        RETURN QUERY SELECT true, 'Orden lista'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'Orden no válida'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error en función básica'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
