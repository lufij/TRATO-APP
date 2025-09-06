-- =====================================================
-- CORRECCIÓN ESPECÍFICA PARA PRODUCTOS DEL DÍA - TRATO APP
-- =====================================================
-- Este script corrige el problema específico basado en tu estructura

-- 1. Actualizar productos del día para que estén disponibles
UPDATE public.daily_products 
SET is_available = true 
WHERE is_available IS NULL OR is_available = false;

-- 2. Función corregida que maneja tu estructura exacta
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
        -- Validar productos del día
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
        
        -- Si no se encontró, devolver error específico
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
                'Regular product not available'::TEXT,
                0.00::DECIMAL(10,2),
                ''::TEXT,
                NULL::UUID,
                false as is_valid,
                'Regular product not found, private, or out of stock'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar que un producto específico (Cerveza) esté funcionando
-- Cambia este ID por el ID real de tu producto Cerveza
DO $$
DECLARE
    cerveza_id UUID;
    validation_result RECORD;
BEGIN
    -- Buscar el ID del producto Cerveza
    SELECT id INTO cerveza_id 
    FROM public.daily_products 
    WHERE name ILIKE '%cerveza%' 
    LIMIT 1;
    
    IF cerveza_id IS NOT NULL THEN
        -- Asegurar que está disponible
        UPDATE public.daily_products 
        SET 
            is_available = true,
            stock_quantity = COALESCE(stock_quantity, 10),
            expires_at = COALESCE(expires_at, NOW() + INTERVAL '1 day')
        WHERE id = cerveza_id;
        
        -- Probar la validación
        SELECT * INTO validation_result 
        FROM validate_and_get_product_data(cerveza_id, 'daily');
        
        RAISE NOTICE 'Producto Cerveza (ID: %): Validación = %', cerveza_id, validation_result.is_valid;
        RAISE NOTICE 'Mensaje: %', validation_result.error_message;
    ELSE
        RAISE NOTICE 'No se encontró producto con nombre "cerveza"';
    END IF;
END $$;

-- 4. Función para probar directamente desde la consola
CREATE OR REPLACE FUNCTION debug_daily_product(product_name_search TEXT)
RETURNS TABLE (
    product_id UUID,
    name TEXT,
    price NUMERIC,
    stock_quantity INTEGER,
    is_available BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    validation_with_daily BOOLEAN,
    validation_with_regular BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.id,
        dp.name,
        dp.price,
        dp.stock_quantity,
        dp.is_available,
        dp.expires_at,
        -- Probar validación como 'daily'
        EXISTS(
            SELECT 1 FROM validate_and_get_product_data(dp.id, 'daily') v 
            WHERE v.is_valid = true
        ) as validation_with_daily,
        -- Probar validación como 'regular' (para comparar)
        EXISTS(
            SELECT 1 FROM validate_and_get_product_data(dp.id, 'regular') v 
            WHERE v.is_valid = true
        ) as validation_with_regular
    FROM public.daily_products dp
    WHERE dp.name ILIKE '%' || product_name_search || '%'
    ORDER BY dp.created_at DESC;
END;
$$ LANGUAGE plpgsql;
