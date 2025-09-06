-- ARREGLAR PROBLEMAS PRODUCTOS DEL DIA - COMPLETO
-- ===============================================

-- 1. ARREGLAR FUNCION DE VALIDACION PARA INCLUIR is_available
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
        AND dp.is_available = true;  -- CRITICO: Agregar validacion is_available

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

-- 2. VERIFICAR ESTADO ACTUAL DE PRODUCTOS
SELECT
    'ESTADO PRODUCTOS DEL DIA DESPUES DEL FIX' as seccion,
    name,
    expires_at,
    is_available,
    stock_quantity,
    CASE
        WHEN expires_at > NOW() AND is_available = true AND stock_quantity > 0
        THEN 'SI DEBERIA FUNCIONAR EN CARRITO'
        ELSE 'NO FUNCIONARA'
    END as estado
FROM daily_products
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
