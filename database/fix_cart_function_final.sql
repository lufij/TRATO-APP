-- =====================================================
-- TRATO - CORRECCIÓN FINAL DE FUNCIÓN ADD_TO_CART_SAFE
-- =====================================================
-- Este script corrige los errores específicos de overloading

BEGIN;

-- =====================================================
-- 1. ELIMINAR FUNCIÓN EXISTENTE PARA EVITAR OVERLOADING
-- =====================================================

DROP FUNCTION IF EXISTS public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.add_to_cart_safe(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.add_to_cart_safe(UUID, UUID);

-- =====================================================
-- 2. CREAR FUNCIÓN SIMPLIFICADA SIN PARÁMETROS OPCIONALES
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_to_cart_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_product_type TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cart_item_id UUID
) AS $$
DECLARE
    existing_item_id UUID;
    new_cart_item_id UUID;
    product_name_val TEXT;
    product_price_val DECIMAL(10,2);
    product_image_val TEXT;
    product_seller_id UUID;
    existing_cart_seller UUID;
BEGIN
    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'ID de usuario y producto son requeridos'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'La cantidad debe ser mayor a 0'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_product_type NOT IN ('regular', 'daily') THEN
        RETURN QUERY SELECT false, 'Tipo de producto inválido'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Obtener información del producto según el tipo
    IF p_product_type = 'daily' THEN
        SELECT name, price, image_url, seller_id 
        INTO product_name_val, product_price_val, product_image_val, product_seller_id
        FROM public.daily_products 
        WHERE id = p_product_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto del día no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    ELSE
        SELECT name, price, image_url, seller_id 
        INTO product_name_val, product_price_val, product_image_val, product_seller_id
        FROM public.products 
        WHERE id = p_product_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    -- Verificar si ya hay productos de otro vendedor en el carrito
    SELECT DISTINCT seller_id INTO existing_cart_seller
    FROM public.cart_items 
    WHERE user_id = p_user_id 
    AND seller_id IS NOT NULL
    LIMIT 1;

    -- Si hay productos de otro vendedor, rechazar
    IF existing_cart_seller IS NOT NULL AND existing_cart_seller != product_seller_id THEN
        RETURN QUERY SELECT 
            false, 
            'Solo puedes tener productos de un vendedor en el carrito'::TEXT,
            NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si el producto ya está en el carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND product_type = p_product_type;

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar cantidad del item existente
        UPDATE public.cart_items 
        SET 
            quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT true, 'Cantidad actualizada en el carrito'::TEXT, existing_item_id;
    ELSE
        -- Crear nuevo item en el carrito
        INSERT INTO public.cart_items (
            user_id,
            product_id,
            product_type,
            quantity,
            product_name,
            product_price,
            product_image,
            seller_id,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_product_id,
            p_product_type,
            p_quantity,
            product_name_val,
            product_price_val,
            product_image_val,
            product_seller_id,
            NOW(),
            NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT true, 'Producto agregado al carrito exitosamente'::TEXT, new_cart_item_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, ('Error interno: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. PERMISOS PARA LA NUEVA FUNCIÓN
-- =====================================================

GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- =====================================================
-- 4. FUNCIÓN DE PRUEBA
-- =====================================================

-- Crear función de prueba para verificar que funciona
CREATE OR REPLACE FUNCTION public.test_add_to_cart()
RETURNS TEXT AS $$
DECLARE
    test_user_id UUID;
    test_product_id UUID;
    result RECORD;
BEGIN
    -- Obtener IDs de prueba
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    SELECT id INTO test_product_id FROM public.daily_products LIMIT 1;
    
    IF test_user_id IS NULL OR test_product_id IS NULL THEN
        RETURN 'No hay datos de prueba disponibles';
    END IF;
    
    -- Probar la función
    SELECT * INTO result FROM public.add_to_cart_safe(test_user_id, test_product_id, 1, 'daily');
    
    RETURN 'Función probada: ' || result.message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Ejecutar prueba
SELECT public.test_add_to_cart() as test_result;

SELECT 'Función add_to_cart_safe corregida y probada' as status;
