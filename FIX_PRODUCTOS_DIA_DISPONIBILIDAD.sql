-- =====================================================
-- FIX URGENTE - VALIDACIÓN PRODUCTOS DEL DÍA DISPONIBLES
-- =====================================================
-- Ejecutar INMEDIATAMENTE en SQL Editor de Supabase

-- 🗑️ ELIMINAR FUNCIÓN CON PROBLEMA
DROP FUNCTION IF EXISTS public.add_to_cart_safe CASCADE;

-- ✅ CREAR FUNCIÓN CORREGIDA - VALIDACIÓN MEJORADA
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
    available_stock INTEGER;
    product_expires TIMESTAMPTZ;
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

    -- Obtener información del producto según el tipo
    IF p_product_type = 'daily' THEN
        -- Buscar en daily_products con validación mejorada
        SELECT 
            name, 
            price, 
            image_url, 
            seller_id,
            stock_quantity,
            expires_at
        INTO 
            product_name_val, 
            product_price_val, 
            product_image_val, 
            product_seller_id,
            available_stock,
            product_expires
        FROM public.daily_products 
        WHERE id = p_product_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto del día no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        -- Verificar stock disponible
        IF available_stock <= 0 THEN
            RETURN QUERY SELECT false, 'Producto del día sin stock'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        -- Verificar si todavía está disponible (más flexible)
        IF product_expires <= NOW() THEN
            RETURN QUERY SELECT false, 'Producto del día ya expiró'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        -- Verificar cantidad solicitada vs stock
        IF p_quantity > available_stock THEN
            RETURN QUERY SELECT false, CONCAT('Solo quedan ', available_stock, ' unidades disponibles')::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
    ELSE
        -- Buscar en products regulares
        SELECT name, price, image_url, seller_id, stock_quantity
        INTO product_name_val, product_price_val, product_image_val, product_seller_id, available_stock
        FROM public.products 
        WHERE id = p_product_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        -- Verificar stock para productos regulares
        IF available_stock <= 0 THEN
            RETURN QUERY SELECT false, 'Producto sin stock'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        IF p_quantity > available_stock THEN
            RETURN QUERY SELECT false, CONCAT('Solo quedan ', available_stock, ' unidades disponibles')::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    -- Verificar si el producto ya está en el carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND product_type = COALESCE(p_product_type, 'regular');

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar cantidad existente
        UPDATE public.cart_items 
        SET quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT 
            true,
            'Cantidad actualizada en el carrito'::TEXT,
            existing_item_id;
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
            added_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_product_id,
            COALESCE(p_product_type, 'regular'),
            p_quantity,
            product_name_val,
            product_price_val,
            product_image_val,
            product_seller_id,
            NOW(),
            NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT 
            true,
            'Producto agregado al carrito exitosamente'::TEXT,
            new_cart_item_id;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        false,
        'Error interno: ' || SQLERRM,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PERMISOS
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- ✅ VERIFICACIÓN DE PRODUCTOS DEL DÍA ACTIVOS
SELECT 
    'PRODUCTOS DEL DÍA DISPONIBLES:' as info,
    id,
    name,
    stock_quantity,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN 'DISPONIBLE' 
        ELSE 'EXPIRADO' 
    END as status,
    EXTRACT(HOUR FROM (expires_at - NOW())) as horas_restantes
FROM public.daily_products 
WHERE stock_quantity > 0
ORDER BY expires_at;

SELECT 'add_to_cart_safe CORREGIDA - Validación de disponibilidad mejorada' as resultado;
