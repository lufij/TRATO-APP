-- SOLUCIÓN FINAL PARA DINE-IN SIN COLUMNA MESSAGE
-- ==============================================

-- Función seller_mark_completed_pickup CORREGIDA (sin columna message)
CREATE OR REPLACE FUNCTION seller_mark_completed_pickup(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_buyer_id UUID;
    v_message TEXT;
BEGIN
    -- Obtener información de la orden
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
    
    IF v_current_status != 'ready' THEN
        RETURN QUERY SELECT false, ('La orden debe estar lista primero. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'completed'
    UPDATE orders 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Determinar mensaje según tipo
    CASE 
        WHEN v_delivery_type = 'pickup' THEN
            v_message := 'Orden pickup completada exitosamente';
        WHEN v_delivery_type = 'dine-in' THEN
            v_message := 'Orden dine-in servida exitosamente';
        WHEN v_delivery_type = 'dine_in' THEN
            v_message := 'Orden dine-in servida exitosamente';
        ELSE
            v_message := 'Orden completada exitosamente (tipo: ' || COALESCE(v_delivery_type, 'desconocido') || ')';
    END CASE;
    
    -- Notificar al cliente (solo si existe la tabla notifications)
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
            INSERT INTO notifications (user_id, order_id, message, type, created_at)
            VALUES (v_buyer_id, p_order_id, 'Tu orden ha sido completada exitosamente', 'order_completed', NOW());
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Continuar sin error
    END;
    
    RETURN QUERY SELECT true, v_message::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función seller_mark_completed_pickup_safe SIMPLIFICADA
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
    -- Verificar orden
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
    
    -- Actualizar estado
    UPDATE orders 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, ('Orden ' || COALESCE(v_delivery_type, 'desconocida') || ' completada')::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función básica ULTRA SIMPLE
CREATE OR REPLACE FUNCTION seller_mark_completed_pickup_basic(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
    -- Verificación y actualización mínima
    IF EXISTS(SELECT 1 FROM orders WHERE id = p_order_id AND seller_id = p_seller_id AND status = 'ready') THEN
        UPDATE orders 
        SET status = 'completed', completed_at = NOW(), updated_at = NOW() 
        WHERE id = p_order_id;
        
        RETURN QUERY SELECT true, 'Orden servida exitosamente'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'Orden no válida para completar'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error básico: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
