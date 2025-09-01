-- =====================================================
-- 🔧 FUNCIÓN SIMPLE PARA VENDEDOR - ACEPTAR ÓRDENES
-- =====================================================

-- Esta función permite al vendedor aceptar órdenes de forma simple
-- y activa el trigger de stock automáticamente

CREATE OR REPLACE FUNCTION public.seller_accept_order(
    p_order_id UUID,
    p_seller_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
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
    
    IF v_current_status != 'pending' THEN
        RETURN QUERY SELECT false, 'Esta orden ya no está pendiente'::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'accepted'
    UPDATE orders 
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, 'Orden aceptada exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.seller_accept_order(UUID, UUID) TO authenticated;

-- FUNCIÓN SIMPLE PARA CAMBIAR A READY
CREATE OR REPLACE FUNCTION public.seller_mark_ready(
    p_order_id UUID,
    p_seller_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
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
    
    -- Actualizar estado a 'ready'
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

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.seller_mark_ready(UUID, UUID) TO authenticated;
