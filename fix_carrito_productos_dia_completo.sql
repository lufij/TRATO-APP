-- ARREGLAR PROBLEMAS PRODUCTOS DEL DÍA - COMPLETO
-- ===============================================

-- 1. ARREGLAR FUNCIÓN DE VALIDACIÓN PARA INCLUIR is_available
CREATE OR REPLACE FUNCTION validate_and_get_product_data(
    p_product_id UUID,
    p_product_type TEXT DEFAULT 'regular'
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_price DECIMAL(10,2),
    product_image TEXT,
    seller_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    IF p_product_type = 'daily' THEN
        RETURN QUERY
        SELECT 
            dp.id,
            dp.name,
            dp.price,
            COALESCE(dp.image_url, '') as image_url,
            dp.seller_id,
            true as is_valid,
            'Valid daily product'::TEXT as error_message
        FROM public.daily_products dp
        WHERE dp.id = p_product_id 
        AND dp.expires_at > NOW()
        AND dp.stock_quantity > 0
        AND dp.is_available = true;  -- ✅ CRÍTICO: Agregar validación is_available
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Daily product not available'::TEXT,
                0.00::DECIMAL(10,2),
                ''::TEXT,
                NULL::UUID,
                false as is_valid,
                'Daily product not found, expired, out of stock, or not available'::TEXT;
        END IF;
    ELSE
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.price,
            COALESCE(p.image_url, '') as image_url,
            p.seller_id,
            true as is_valid,
            'Valid regular product'::TEXT as error_message
        FROM public.products p
        WHERE p.id = p_product_id 
        AND COALESCE(p.is_public, true) = true
        AND p.stock_quantity > 0;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Regular product not found'::TEXT,
                0.00::DECIMAL(10,2),
                ''::TEXT,
                NULL::UUID,
                false as is_valid,
                'Regular product not found, private, or out of stock'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. VERIFICAR QUE LA FUNCIÓN add_to_cart_safe EXISTE Y ES CORRECTA
CREATE OR REPLACE FUNCTION add_to_cart_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_product_type TEXT DEFAULT 'regular'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cart_item_id UUID
) AS $$
DECLARE
    validation_result RECORD;
    existing_item_id UUID;
    new_cart_item_id UUID;
BEGIN
    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'User ID and Product ID are required', NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'Quantity must be greater than 0', NULL::UUID;
        RETURN;
    END IF;

    -- Validar producto
    SELECT * INTO validation_result 
    FROM validate_and_get_product_data(p_product_id, p_product_type);
    
    IF NOT validation_result.is_valid THEN
        RETURN QUERY SELECT false, validation_result.error_message, NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si ya existe en carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND COALESCE(product_type, 'regular') = p_product_type;

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar existente
        UPDATE public.cart_items 
        SET 
            quantity = quantity + p_quantity,
            updated_at = NOW(),
            product_name = validation_result.product_name,
            product_price = validation_result.product_price,
            product_image = validation_result.product_image,
            seller_id = validation_result.seller_id
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT true, 'Product quantity updated in cart', existing_item_id;
    ELSE
        -- Crear nuevo item
        INSERT INTO public.cart_items (
            user_id, product_id, product_type, quantity,
            product_name, product_price, product_image, seller_id,
            created_at, updated_at
        ) VALUES (
            p_user_id, p_product_id, p_product_type, p_quantity,
            validation_result.product_name, validation_result.product_price, 
            validation_result.product_image, validation_result.seller_id,
            NOW(), NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT true, 'Product added to cart successfully', new_cart_item_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. VERIFICAR ESTADO ACTUAL DE PRODUCTOS
SELECT 
    'ESTADO PRODUCTOS DEL DÍA DESPUÉS DEL FIX' as seccion,
    name,
    expires_at,
    is_available,
    stock_quantity,
    CASE 
        WHEN expires_at > NOW() AND is_available = true AND stock_quantity > 0 
        THEN '✅ DEBERÍA FUNCIONAR EN CARRITO'
        ELSE '❌ NO FUNCIONARÁ'
    END as estado
FROM daily_products
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
