-- =====================================================
-- FIX CREAR ÓRDENES - INCLUIR PRODUCT_TYPE
-- =====================================================

-- Actualizar la función que transfiere product_type del carrito a order_items
-- Este es el SQL que debe ejecutar el OrderContext cuando crea órdenes

-- 1. Verificar cart_items con product_type
SELECT 
    'CART_ITEMS CON PRODUCT_TYPE:' as check_name,
    COUNT(*) as total_items,
    COUNT(CASE WHEN product_type = 'daily' THEN 1 END) as productos_dia,
    COUNT(CASE WHEN product_type = 'regular' THEN 1 END) as productos_regulares
FROM cart_items;

-- 2. Crear función para transferir carritos a órdenes correctamente
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_user_id UUID,
    p_order_data JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    order_id UUID
) AS $$
DECLARE
    v_order_id UUID;
    v_cart_item RECORD;
BEGIN
    -- Crear la orden principal
    INSERT INTO public.orders (
        buyer_id,
        seller_id,
        subtotal,
        delivery_fee,
        total,
        delivery_type,
        delivery_address,
        customer_notes,
        phone_number,
        customer_name,
        status,
        estimated_time
    ) VALUES (
        p_user_id,
        (p_order_data->>'seller_id')::UUID,
        (p_order_data->>'subtotal')::DECIMAL,
        (p_order_data->>'delivery_fee')::DECIMAL,
        (p_order_data->>'total')::DECIMAL,
        p_order_data->>'delivery_type',
        p_order_data->>'delivery_address',
        p_order_data->>'customer_notes',
        p_order_data->>'phone_number',
        p_order_data->>'customer_name',
        'pending',
        30
    ) RETURNING id INTO v_order_id;

    -- Transferir items del carrito incluyendo product_type
    FOR v_cart_item IN 
        SELECT * FROM cart_items WHERE user_id = p_user_id
    LOOP
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_image,
            price,
            quantity,
            product_type,  -- ← ESTO ES LO IMPORTANTE
            notes
        ) VALUES (
            v_order_id,
            v_cart_item.product_id,
            v_cart_item.product_name,
            v_cart_item.product_image,
            v_cart_item.product_price,
            v_cart_item.quantity,
            COALESCE(v_cart_item.product_type, 'regular'), -- ← TRANSFERIR PRODUCT_TYPE
            ''
        );
    END LOOP;

    -- Limpiar carrito
    DELETE FROM cart_items WHERE user_id = p_user_id;

    RETURN QUERY SELECT true, 'Orden creada exitosamente'::TEXT, v_order_id;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Dar permisos
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(UUID, JSONB) TO authenticated;

-- 4. Verificación
SELECT 'Función create_order_from_cart creada exitosamente' as status;
