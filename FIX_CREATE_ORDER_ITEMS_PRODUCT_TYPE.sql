-- =====================================================
-- 🚨 FIX FUNCIÓN create_order_items_safe 
-- =====================================================

-- PROBLEMA: create_order_items_safe no incluye product_type
-- SOLUCIÓN: Actualizar la función para incluir product_type

CREATE OR REPLACE FUNCTION public.create_order_items_safe(
    p_order_id UUID,
    p_items JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_item JSONB;
    v_order_exists BOOLEAN := false;
BEGIN
    -- Validar que la orden existe
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE id = p_order_id) INTO v_order_exists;
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    -- Validar que hay items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN QUERY SELECT false, 'No hay items para agregar'::TEXT;
        RETURN;
    END IF;
    
    -- Insertar cada item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_image,
            price,
            unit_price,
            quantity,
            product_type,  -- ✅ AGREGAR ESTA LÍNEA
            notes
        ) VALUES (
            p_order_id,
            COALESCE((v_item->>'product_id')::UUID, NULL),
            COALESCE(v_item->>'product_name', 'Producto'),
            COALESCE(v_item->>'product_image', ''),
            COALESCE((v_item->>'price')::DECIMAL(10,2), 0),
            COALESCE((v_item->>'unit_price')::DECIMAL(10,2), COALESCE((v_item->>'price')::DECIMAL(10,2), 0)),
            COALESCE((v_item->>'quantity')::INTEGER, 1),
            COALESCE(v_item->>'product_type', 'regular'),  -- ✅ AGREGAR ESTA LÍNEA
            COALESCE(v_item->>'notes', '')
        );
    END LOOP;
    
    RETURN QUERY SELECT true, 'Items de orden creados exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.create_order_items_safe(UUID, JSONB) TO authenticated;
