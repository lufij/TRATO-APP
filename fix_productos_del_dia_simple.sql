-- =====================================================
-- TRATO - CORRECCIÓN ESPECÍFICA PRODUCTOS DEL DÍA
-- =====================================================
-- Script simplificado que se enfoca solo en el problema de productos del día
-- Compatible con Supabase SQL Editor

-- Paso 1: Corregir la función de validación
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
        AND COALESCE(dp.is_available, true) = true;  -- ✅ CORRECCIÓN CRÍTICA
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Daily product not found'::TEXT,
                0.00::DECIMAL(10,2),
                ''::TEXT,
                NULL::UUID,
                false as is_valid,
                'Daily product not found, expired, out of stock, or not available'::TEXT;
        END IF;
    ELSE
        -- Productos regulares
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

-- Paso 2: Corregir/crear la función add_to_cart_safe
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
    existing_cart_seller UUID;
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

    -- Validar producto usando la función corregida
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
            product_image = validation_result.product_image
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT true, 'Product quantity updated in cart', existing_item_id;
    ELSE
        -- Crear nuevo item
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 3: Verificar que daily_products tenga las columnas necesarias
DO $$
BEGIN
    -- Agregar is_available si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'daily_products' AND column_name = 'is_available'
    ) THEN
        ALTER TABLE public.daily_products ADD COLUMN is_available BOOLEAN DEFAULT true;
    END IF;
    
    -- Asegurar que todos los productos existentes estén disponibles
    UPDATE public.daily_products 
    SET is_available = true 
    WHERE is_available IS NULL;
END $$;

-- Paso 4: Verificar que cart_items tenga las columnas necesarias
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

-- Paso 5: Crear función de verificación para probar
CREATE OR REPLACE FUNCTION test_daily_product_validation(product_name_like TEXT)
RETURNS TABLE (
    product_name TEXT,
    product_id UUID,
    stock_quantity INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_available BOOLEAN,
    validation_result BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.name,
        dp.id,
        dp.stock_quantity,
        dp.expires_at,
        COALESCE(dp.is_available, true) as is_available,
        (dp.expires_at > NOW() AND dp.stock_quantity > 0 AND COALESCE(dp.is_available, true) = true) as validation_result,
        CASE 
            WHEN dp.expires_at <= NOW() THEN 'Expired'
            WHEN dp.stock_quantity <= 0 THEN 'Out of stock'
            WHEN COALESCE(dp.is_available, true) != true THEN 'Not available'
            ELSE 'Valid'
        END as error_message
    FROM public.daily_products dp
    WHERE dp.name ILIKE '%' || product_name_like || '%'
    ORDER BY dp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
