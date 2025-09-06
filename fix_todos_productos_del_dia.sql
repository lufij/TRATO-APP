-- =====================================================
-- CORRECCIÓN COMPLETA PARA TODOS LOS PRODUCTOS DEL DÍA
-- =====================================================

-- 1. Asegurar que TODOS los productos del día estén disponibles
UPDATE public.daily_products 
SET 
    is_available = true,
    stock_quantity = COALESCE(stock_quantity, 10),
    expires_at = COALESCE(expires_at, NOW() + INTERVAL '1 day')
WHERE is_available IS NULL 
   OR is_available = false 
   OR stock_quantity IS NULL 
   OR stock_quantity <= 0
   OR expires_at IS NULL
   OR expires_at <= NOW();

-- 2. Función de validación CORREGIDA para manejar productos del día
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
        -- Validar productos del día con condiciones flexibles
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
        AND (dp.expires_at IS NULL OR dp.expires_at > NOW())
        AND (dp.stock_quantity IS NULL OR dp.stock_quantity > 0)
        AND (dp.is_available IS NULL OR dp.is_available = true);
        
        -- Si no se encontró, intentar encontrar el producto para dar error específico
        IF NOT FOUND THEN
            -- Verificar si el producto existe pero no cumple condiciones
            IF EXISTS (SELECT 1 FROM public.daily_products WHERE id = p_product_id) THEN
                RETURN QUERY SELECT 
                    p_product_id,
                    'Daily product unavailable'::TEXT,
                    0.00::DECIMAL(10,2),
                    ''::TEXT,
                    NULL::UUID,
                    false as is_valid,
                    'Daily product expired, out of stock, or not available'::TEXT;
            ELSE
                RETURN QUERY SELECT 
                    p_product_id,
                    'Daily product not found'::TEXT,
                    0.00::DECIMAL(10,2),
                    ''::TEXT,
                    NULL::UUID,
                    false as is_valid,
                    'Daily product does not exist'::TEXT;
            END IF;
        END IF;
        
    ELSE
        -- Validar productos regulares
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
        AND (p.is_public IS NULL OR p.is_public = true)
        AND (p.stock_quantity IS NULL OR p.stock_quantity > 0);
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Regular product unavailable'::TEXT,
                0.00::DECIMAL(10,2),
                ''::TEXT,
                NULL::UUID,
                false as is_valid,
                'Regular product not found, private, or out of stock'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función add_to_cart_safe actualizada
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

    IF p_product_type NOT IN ('regular', 'daily') THEN
        RETURN QUERY SELECT false, 'Invalid product type. Must be regular or daily', NULL::UUID;
        RETURN;
    END IF;

    -- Validar producto usando función corregida
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
        -- Asegurar que cart_items tenga todas las columnas necesarias
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
            validation_result.product_name, 
            validation_result.product_price, 
            validation_result.product_image, 
            validation_result.seller_id,
            NOW(), 
            NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT true, 'Product added to cart successfully', new_cart_item_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Database error: ' || SQLERRM, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Asegurar que cart_items tenga todas las columnas
DO $$
BEGIN
    -- product_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular';
    END IF;
    
    -- product_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
    END IF;
    
    -- product_price
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
    END IF;
    
    -- product_image
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
    END IF;
    
    -- seller_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
    END IF;
    
    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 5. Verificar estado de TODOS los productos del día
SELECT 
    'VERIFICACIÓN PRODUCTOS DEL DÍA' as seccion,
    COUNT(*) as total_productos,
    COUNT(CASE WHEN is_available = true THEN 1 END) as disponibles,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as no_expirados,
    COUNT(CASE 
        WHEN (is_available IS NULL OR is_available = true) 
        AND (stock_quantity IS NULL OR stock_quantity > 0)
        AND (expires_at IS NULL OR expires_at > NOW())
        THEN 1 
    END) as completamente_validos
FROM public.daily_products;

-- 6. Mostrar productos del día que podrían tener problemas
SELECT 
    'PRODUCTOS CON POSIBLES PROBLEMAS' as seccion,
    id,
    name,
    is_available,
    stock_quantity,
    expires_at,
    CASE 
        WHEN is_available = false THEN 'No disponible'
        WHEN stock_quantity <= 0 THEN 'Sin stock'
        WHEN expires_at <= NOW() THEN 'Expirado'
        ELSE 'OK'
    END as problema
FROM public.daily_products
WHERE is_available = false 
   OR stock_quantity <= 0 
   OR expires_at <= NOW()
ORDER BY name;
