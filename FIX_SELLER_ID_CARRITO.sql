-- DIAGNÓSTICO Y CORRECCIÓN: Seller ID faltante en carrito
-- Ejecutar en Supabase SQL Editor para identificar y solucionar el problema

-- =====================================================
-- 1. DIAGNÓSTICO: Verificar estado actual del carrito
-- =====================================================

-- Verificar items del carrito sin seller_id
SELECT 
    ci.id,
    ci.user_id,
    ci.product_id,
    ci.product_name,
    ci.seller_id,
    CASE 
        WHEN ci.seller_id IS NULL THEN '❌ SIN SELLER_ID'
        ELSE '✅ TIENE SELLER_ID'
    END as estado_seller_id
FROM cart_items ci
WHERE ci.seller_id IS NULL
ORDER BY ci.created_at DESC;

-- =====================================================
-- 2. CORRECCIÓN: Actualizar seller_id faltante
-- =====================================================

-- Actualizar items del carrito que no tienen seller_id usando productos regulares
UPDATE cart_items ci
SET seller_id = p.seller_id
FROM products p
WHERE ci.product_id = p.id
AND ci.seller_id IS NULL
AND ci.product_type = 'regular';

-- Actualizar items del carrito que no tienen seller_id usando productos del día
UPDATE cart_items ci
SET seller_id = pd.seller_id
FROM daily_products pd
WHERE ci.product_id = pd.id
AND ci.seller_id IS NULL
AND ci.product_type = 'daily';

-- =====================================================
-- 3. VERIFICACIÓN: Confirmar que se solucionó
-- =====================================================

-- Verificar que todos los items ahora tienen seller_id
SELECT 
    'Items sin seller_id restantes:' as descripcion,
    COUNT(*) as cantidad
FROM cart_items 
WHERE seller_id IS NULL;

-- Mostrar estado actual del carrito
SELECT 
    ci.id,
    ci.user_id,
    ci.product_name,
    ci.seller_id,
    '✅ CORREGIDO' as estado
FROM cart_items ci
WHERE ci.seller_id IS NOT NULL
ORDER BY ci.created_at DESC
LIMIT 10;

-- =====================================================
-- 4. PREVENCIÓN: Mejorar función add_to_cart_safe
-- =====================================================

-- Recrear función para asegurar que siempre incluya seller_id
CREATE OR REPLACE FUNCTION public.add_to_cart_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_product_type TEXT DEFAULT 'regular'
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
BEGIN
    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL OR p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'Parámetros inválidos'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Obtener información del producto según el tipo
    IF p_product_type = 'daily' THEN
        SELECT name, price, image_url, seller_id 
        INTO product_name_val, product_price_val, product_image_val, product_seller_id
        FROM public.daily_products 
        WHERE id = p_product_id
        AND expires_at > NOW()
        AND stock_quantity > 0;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto del día no disponible'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    ELSE
        SELECT name, price, image_url, seller_id 
        INTO product_name_val, product_price_val, product_image_val, product_seller_id
        FROM public.products 
        WHERE id = p_product_id
        AND is_public = true
        AND stock_quantity > 0;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto no disponible'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    -- ❗ VERIFICACIÓN CRÍTICA: Asegurar que tenemos seller_id
    IF product_seller_id IS NULL THEN
        RETURN QUERY SELECT false, 'Error: Producto sin vendedor asignado'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si ya existe en el carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND product_type = p_product_type;

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar cantidad y asegurar seller_id
        UPDATE public.cart_items 
        SET quantity = quantity + p_quantity,
            seller_id = product_seller_id,  -- Asegurar seller_id
            updated_at = NOW()
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT true, 'Cantidad actualizada'::TEXT, existing_item_id;
    ELSE
        -- Crear nuevo item con seller_id obligatorio
        INSERT INTO public.cart_items (
            user_id, 
            product_id, 
            product_type, 
            quantity,
            product_name,
            product_price,
            product_image,
            seller_id,  -- ❗ OBLIGATORIO
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
            product_seller_id,  -- ❗ NUNCA NULL
            NOW(),
            NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT true, 'Producto agregado'::TEXT, new_cart_item_id;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- =====================================================
-- 5. RESULTADO FINAL
-- =====================================================

SELECT '✅ Corrección de seller_id completada' as resultado;
SELECT 'Items en carrito con seller_id:' as descripcion, COUNT(*) as cantidad FROM cart_items WHERE seller_id IS NOT NULL;
SELECT 'Items en carrito sin seller_id:' as descripcion, COUNT(*) as cantidad FROM cart_items WHERE seller_id IS NULL;
