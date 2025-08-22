-- =====================================================
-- TRATO - CORRECCIÓN ULTRA SIMPLE PARA CARRITO
-- =====================================================
-- Esta es la versión más simple posible para evitar errores

-- =====================================================
-- 1. LIMPIAR COMPLETAMENTE CUALQUIER FUNCIÓN EXISTENTE
-- =====================================================

DROP FUNCTION IF EXISTS public.add_to_cart_safe CASCADE;

-- =====================================================
-- 2. CREAR FUNCIÓN NUEVA CON NOMBRE ÚNICO
-- =====================================================

CREATE FUNCTION public.add_to_cart_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_product_type TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cart_item_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_item_id UUID;
    new_cart_item_id UUID;
    product_name_val TEXT := 'Producto';
    product_price_val DECIMAL(10,2) := 0.00;
    product_image_val TEXT := '';
    product_seller_id UUID;
BEGIN
    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'Parámetros requeridos'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'Cantidad inválida'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Obtener info del producto (simple)
    BEGIN
        IF p_product_type = 'daily' THEN
            SELECT name, price, image_url, seller_id 
            INTO product_name_val, product_price_val, product_image_val, product_seller_id
            FROM public.daily_products 
            WHERE id = p_product_id
            LIMIT 1;
        ELSE
            SELECT name, price, image_url, seller_id 
            INTO product_name_val, product_price_val, product_image_val, product_seller_id
            FROM public.products 
            WHERE id = p_product_id
            LIMIT 1;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, 'Error al buscar producto'::TEXT, NULL::UUID;
            RETURN;
    END;

    -- Verificar si producto ya está en carrito
    BEGIN
        SELECT id INTO existing_item_id
        FROM public.cart_items
        WHERE user_id = p_user_id 
        AND product_id = p_product_id 
        AND product_type = p_product_type
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            existing_item_id := NULL;
    END;

    -- Insertar o actualizar
    BEGIN
        IF existing_item_id IS NOT NULL THEN
            -- Actualizar existente
            UPDATE public.cart_items 
            SET quantity = quantity + p_quantity
            WHERE id = existing_item_id;
            
            RETURN QUERY SELECT true, 'Cantidad actualizada'::TEXT, existing_item_id;
        ELSE
            -- Insertar nuevo
            INSERT INTO public.cart_items (
                user_id, product_id, product_type, quantity,
                product_name, product_price, product_image, seller_id
            ) VALUES (
                p_user_id, p_product_id, p_product_type, p_quantity,
                COALESCE(product_name_val, 'Producto'),
                COALESCE(product_price_val, 0.00),
                COALESCE(product_image_val, ''),
                product_seller_id
            ) RETURNING id INTO new_cart_item_id;
            
            RETURN QUERY SELECT true, 'Producto agregado'::TEXT, new_cart_item_id;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, 'Error al guardar'::TEXT, NULL::UUID;
            RETURN;
    END;
END;
$$;

-- =====================================================
-- 3. PERMISOS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.add_to_cart_safe TO authenticated;

-- =====================================================
-- 4. VERIFICACIÓN
-- =====================================================

SELECT 'Función simple creada exitosamente' as status;
