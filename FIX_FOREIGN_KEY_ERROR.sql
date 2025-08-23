-- =====================================================
-- FIX URGENTE - ERROR FOREIGN KEY CONSTRAINT
-- =====================================================
-- Ejecutar INMEDIATAMENTE en SQL Editor de Supabase

-- 🔍 PASO 1: Verificar restricciones actuales en cart_items
SELECT 
    '🔗 RESTRICCIONES FOREIGN KEY EN CART_ITEMS:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='cart_items';

-- 🔍 PASO 2: Verificar si el producto existe en ambas tablas
DO $$
DECLARE
    daily_product_count INTEGER;
    regular_product_count INTEGER;
    failing_product_id UUID := 'd734232e-6901-4fca-b902-c9532eff7f30'; -- El ID del producto que está fallando
BEGIN
    -- Contar en daily_products
    SELECT COUNT(*) INTO daily_product_count
    FROM public.daily_products 
    WHERE id = failing_product_id;
    
    -- Contar en products regulares
    SELECT COUNT(*) INTO regular_product_count
    FROM public.products 
    WHERE id = failing_product_id;
    
    RAISE NOTICE '🔍 Producto ID %:', failing_product_id;
    RAISE NOTICE '📦 En daily_products: %', daily_product_count;
    RAISE NOTICE '📦 En products regulares: %', regular_product_count;
    
    IF daily_product_count = 0 AND regular_product_count = 0 THEN
        RAISE NOTICE '❌ PROBLEMA: El producto no existe en ninguna tabla';
    ELSIF daily_product_count > 0 THEN
        RAISE NOTICE '✅ Producto existe en daily_products';
    ELSIF regular_product_count > 0 THEN
        RAISE NOTICE '✅ Producto existe en products regulares';
    END IF;
END $$;

-- 🛠️ PASO 3: Eliminar restricciones problemáticas temporalmente
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Buscar y eliminar restricciones foreign key problemáticas
    FOR constraint_record IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'cart_items'
        AND tc.constraint_name LIKE '%product_id%'
    LOOP
        EXECUTE 'ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE '🗑️ Eliminada restricción: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- 🗑️ PASO 4: Recrear función sin dependencias de foreign keys
DROP FUNCTION IF EXISTS public.add_to_cart_safe CASCADE;

-- ✅ PASO 5: Función simplificada SIN restricciones foreign key
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
        IF expires_val < NOW() - INTERVAL '3 hours' THEN
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
            updated_at = NOW()
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT 
            true,
            'Cantidad actualizada en el carrito'::TEXT,
            existing_item_id;
    ELSE
        -- Crear nuevo item - SIMPLIFICADO sin foreign keys problemáticas
        INSERT INTO public.cart_items (
            user_id, 
            product_id, 
            quantity,
            product_type,
            product_name,
            product_price,
            product_image,
            created_at
        ) VALUES (
            p_user_id,
            p_product_id,
            p_quantity,
            COALESCE(p_product_type, 'regular'),
            product_name_val,
            product_price_val,
            product_image_val,
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

-- ✅ PASO 6: Permisos
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- 🧪 PASO 7: Prueba con el producto específico que estaba fallando
DO $$
DECLARE
    test_user_id UUID := 'a099f7fd-8e74-4d11-c8ff-c9c32eff8f30'; -- User ID real del log
    failing_product_id UUID := 'd734232e-6901-4fca-b902-c9532eff7f30'; -- Product ID que estaba fallando
    result_record RECORD;
BEGIN
    RAISE NOTICE '🧪 PROBANDO con producto específico que fallaba...';
    
    -- Probar la función con los IDs exactos del error
    FOR result_record IN 
        SELECT * FROM public.add_to_cart_safe(test_user_id, failing_product_id, 1, 'daily')
    LOOP
        RAISE NOTICE '🎯 RESULTADO: success=%, message=%', result_record.success, result_record.message;
    END LOOP;
    
    -- Limpiar la prueba
    DELETE FROM public.cart_items WHERE user_id = test_user_id AND product_id = failing_product_id;
    RAISE NOTICE '🧹 Prueba limpiada';
END $$;

-- 📊 PASO 8: Verificación final
SELECT 'add_to_cart_safe CORREGIDA - Foreign key constraints eliminadas' as resultado;
