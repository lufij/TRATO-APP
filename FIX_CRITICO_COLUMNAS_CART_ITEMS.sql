-- =====================================================
-- FIX CRÍTICO - COLUMNA FALTANTE EN CART_ITEMS
-- =====================================================
-- Ejecutar INMEDIATAMENTE en SQL Editor de Supabase

-- 🔍 PASO 1: Verificar estructura actual de cart_items
SELECT 
    '🗂️ COLUMNAS ACTUALES EN CART_ITEMS:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 🛠️ PASO 2: Agregar columnas faltantes
DO $$
BEGIN
    -- Agregar added_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'added_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN added_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Columna added_at agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna added_at ya existe';
    END IF;
    
    -- Verificar y agregar otras columnas necesarias
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular';
        RAISE NOTICE '✅ Columna product_type agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
        RAISE NOTICE '✅ Columna product_name agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
        RAISE NOTICE '✅ Columna product_price agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
        RAISE NOTICE '✅ Columna product_image agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
        RAISE NOTICE '✅ Columna seller_id agregada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Columna updated_at agregada';
    END IF;
END $$;

-- 🗑️ PASO 3: Recrear función con columnas correctas
DROP FUNCTION IF EXISTS public.add_to_cart_safe CASCADE;

-- ✅ PASO 4: Función simplificada que funciona con la estructura real
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
    stock_val INTEGER;
    expires_val TIMESTAMPTZ;
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
            stock_val,
            expires_val
        FROM public.daily_products 
        WHERE id = p_product_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto del día no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        -- Verificar stock
        IF stock_val <= 0 THEN
            RETURN QUERY SELECT false, 'Producto del día sin stock'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        -- Verificar expiración (muy flexible)
        IF expires_val < NOW() - INTERVAL '2 hours' THEN
            RETURN QUERY SELECT false, 'Producto del día ya expiró'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
    ELSE
        -- Buscar en products regulares
        SELECT name, price, image_url, seller_id, stock_quantity
        INTO product_name_val, product_price_val, product_image_val, product_seller_id, stock_val
        FROM public.products 
        WHERE id = p_product_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        IF stock_val <= 0 THEN
            RETURN QUERY SELECT false, 'Producto sin stock'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    -- Verificar si el producto ya está en el carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND COALESCE(product_type, 'regular') = COALESCE(p_product_type, 'regular');

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar cantidad existente
        UPDATE public.cart_items 
        SET quantity = quantity + p_quantity,
            updated_at = COALESCE(updated_at, NOW())
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT 
            true,
            'Cantidad actualizada en el carrito'::TEXT,
            existing_item_id;
    ELSE
        -- Crear nuevo item - usando solo columnas que existen
        INSERT INTO public.cart_items (
            user_id, 
            product_id, 
            quantity,
            product_type,
            product_name,
            product_price,
            product_image,
            seller_id,
            created_at,
            added_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_product_id,
            p_quantity,
            COALESCE(p_product_type, 'regular'),
            product_name_val,
            product_price_val,
            product_image_val,
            product_seller_id,
            NOW(),
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

-- ✅ PASO 5: Permisos
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- 🧪 PASO 6: Prueba inmediata
DO $$
DECLARE
    test_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    test_product_id UUID;
    result_record RECORD;
BEGIN
    SELECT id INTO test_product_id 
    FROM public.daily_products 
    WHERE stock_quantity > 0 
    AND expires_at > NOW()
    LIMIT 1;
    
    IF test_product_id IS NOT NULL THEN
        FOR result_record IN 
            SELECT * FROM public.add_to_cart_safe(test_user_id, test_product_id, 1, 'daily')
        LOOP
            RAISE NOTICE '🧪 PRUEBA: success=%, message=%', result_record.success, result_record.message;
        END LOOP;
        
        DELETE FROM public.cart_items WHERE user_id = test_user_id;
    END IF;
END $$;

-- 📊 PASO 7: Verificación final
SELECT 
    '✅ ESTRUCTURA FINAL CART_ITEMS:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'add_to_cart_safe CORREGIDA - Columnas faltantes agregadas' as resultado;
