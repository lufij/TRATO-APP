-- =====================================================
-- DIAGNÓSTICO Y CORRECCIÓN INMEDIATA - PRODUCTOS DEL DÍA
-- =====================================================
-- Ejecutar COMPLETO en SQL Editor de Supabase

-- 🔍 PASO 1: VERIFICAR FUNCIÓN ACTUAL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'add_to_cart_safe'
    ) THEN
        RAISE NOTICE '✅ Función add_to_cart_safe EXISTS';
    ELSE
        RAISE NOTICE '❌ Función add_to_cart_safe NO EXISTE';
    END IF;
END $$;

-- 🔍 PASO 2: VERIFICAR PRODUCTOS DEL DÍA DISPONIBLES
SELECT 
    '🔍 PRODUCTOS DEL DÍA DISPONIBLES:' as diagnostico,
    COUNT(*) as total_productos,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as no_expirados,
    COUNT(CASE WHEN stock_quantity > 0 AND expires_at > NOW() THEN 1 END) as realmente_disponibles
FROM public.daily_products;

-- 🔍 PASO 3: MOSTRAR DETALLES DE PRODUCTOS ESPECÍFICOS
SELECT 
    '📦 DETALLE PRODUCTOS:' as info,
    id,
    name,
    stock_quantity,
    expires_at,
    EXTRACT(HOUR FROM (expires_at - NOW())) as horas_restantes,
    CASE 
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO' 
        ELSE '✅ DISPONIBLE'
    END as estado_real
FROM public.daily_products
ORDER BY expires_at;

-- 🗑️ PASO 4: LIMPIAR Y RECREAR FUNCIÓN (VERSIÓN SIMPLIFICADA)
DROP FUNCTION IF EXISTS public.add_to_cart_safe CASCADE;

-- ✅ PASO 5: CREAR FUNCIÓN SÚPER SIMPLE PARA DEBUGGING
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
    -- Log de debugging
    RAISE NOTICE 'DEBUG: Iniciando add_to_cart_safe con user_id=%, product_id=%, quantity=%, product_type=%', 
        p_user_id, p_product_id, p_quantity, p_product_type;

    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RAISE NOTICE 'DEBUG: Error - IDs nulos';
        RETURN QUERY SELECT false, 'ID de usuario y producto son requeridos'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RAISE NOTICE 'DEBUG: Error - Cantidad inválida';
        RETURN QUERY SELECT false, 'La cantidad debe ser mayor a 0'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Obtener información del producto según el tipo
    IF p_product_type = 'daily' THEN
        RAISE NOTICE 'DEBUG: Buscando producto del día ID=%', p_product_id;
        
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
            RAISE NOTICE 'DEBUG: Producto del día no encontrado ID=%', p_product_id;
            RETURN QUERY SELECT false, 'Producto del día no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        RAISE NOTICE 'DEBUG: Producto encontrado: %, stock=%, expires=%', product_name_val, stock_val, expires_val;
        
        -- Verificar stock
        IF stock_val <= 0 THEN
            RAISE NOTICE 'DEBUG: Sin stock';
            RETURN QUERY SELECT false, 'Producto del día sin stock'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        -- Verificar expiración - MUY FLEXIBLE
        IF expires_val < NOW() - INTERVAL '1 hour' THEN  -- Dar 1 hora de gracia
            RAISE NOTICE 'DEBUG: Producto expirado hace más de 1 hora';
            RETURN QUERY SELECT false, 'Producto del día ya expiró'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
    ELSE
        -- Buscar en products regulares
        RAISE NOTICE 'DEBUG: Buscando producto regular ID=%', p_product_id;
        
        SELECT name, price, image_url, seller_id, stock_quantity
        INTO product_name_val, product_price_val, product_image_val, product_seller_id, stock_val
        FROM public.products 
        WHERE id = p_product_id;
        
        IF NOT FOUND THEN
            RAISE NOTICE 'DEBUG: Producto regular no encontrado';
            RETURN QUERY SELECT false, 'Producto no encontrado'::TEXT, NULL::UUID;
            RETURN;
        END IF;
        
        IF stock_val <= 0 THEN
            RAISE NOTICE 'DEBUG: Producto regular sin stock';
            RETURN QUERY SELECT false, 'Producto sin stock'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    RAISE NOTICE 'DEBUG: Validaciones pasadas, intentando agregar al carrito';

    -- Verificar si el producto ya está en el carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND product_type = COALESCE(p_product_type, 'regular');

    IF existing_item_id IS NOT NULL THEN
        RAISE NOTICE 'DEBUG: Actualizando item existente ID=%', existing_item_id;
        
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
        RAISE NOTICE 'DEBUG: Creando nuevo item en carrito';
        
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
        
        RAISE NOTICE 'DEBUG: Nuevo item creado ID=%', new_cart_item_id;
        
        RETURN QUERY SELECT 
            true,
            'Producto agregado al carrito exitosamente'::TEXT,
            new_cart_item_id;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'DEBUG: Error en función: %', SQLERRM;
    RETURN QUERY SELECT 
        false,
        'Error interno: ' || SQLERRM,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PASO 6: PERMISOS
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- ✅ PASO 7: PRUEBA INMEDIATA DE LA FUNCIÓN
DO $$
DECLARE
    test_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- UUID fake para prueba
    test_product_id UUID;
    result_record RECORD;
BEGIN
    -- Obtener un producto del día real para probar
    SELECT id INTO test_product_id 
    FROM public.daily_products 
    WHERE stock_quantity > 0 
    AND expires_at > NOW()
    LIMIT 1;
    
    IF test_product_id IS NOT NULL THEN
        RAISE NOTICE '🧪 PROBANDO FUNCIÓN con producto ID: %', test_product_id;
        
        -- Probar la función
        FOR result_record IN 
            SELECT * FROM public.add_to_cart_safe(test_user_id, test_product_id, 1, 'daily')
        LOOP
            RAISE NOTICE '🧪 RESULTADO: success=%, message=%', result_record.success, result_record.message;
        END LOOP;
        
        -- Limpiar la prueba
        DELETE FROM public.cart_items WHERE user_id = test_user_id;
        
    ELSE
        RAISE NOTICE '⚠️ No hay productos del día disponibles para probar';
    END IF;
END $$;

-- 📊 PASO 8: VERIFICACIÓN FINAL
SELECT 'add_to_cart_safe RECREADA con debugging habilitado' as resultado;
