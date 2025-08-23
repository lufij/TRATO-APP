-- =====================================================
-- VERIFICACIÓN POST-FIX - ESTADO ACTUAL
-- =====================================================

-- 🔍 VERIFICAR COLUMNAS FINALES
SELECT 
    '📋 COLUMNAS ACTUALES EN CART_ITEMS:' as estado,
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'Sí' ELSE 'No' END as permite_null
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 🔍 VERIFICAR FUNCIÓN EXISTE
SELECT 
    '⚙️ FUNCIÓN add_to_cart_safe:' as estado,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'add_to_cart_safe'
    ) THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as funcion_estado;

-- 🔍 VERIFICAR PRODUCTOS DEL DÍA DISPONIBLES
SELECT 
    '📦 PRODUCTOS DEL DÍA:' as estado,
    COUNT(*) as total,
    COUNT(CASE WHEN stock_quantity > 0 AND expires_at > NOW() THEN 1 END) as disponibles
FROM public.daily_products;

-- 🔍 DETALLE DE PRODUCTOS ESPECÍFICOS
SELECT 
    '🎯 PRODUCTOS DISPONIBLES:' as estado,
    name,
    stock_quantity,
    EXTRACT(HOUR FROM (expires_at - NOW())) as horas_restantes,
    CASE 
        WHEN stock_quantity > 0 AND expires_at > NOW() THEN '✅ DISPONIBLE'
        ELSE '❌ NO DISPONIBLE'
    END as estado_producto
FROM public.daily_products
ORDER BY expires_at;

-- 🧪 PRUEBA FINAL DE FUNCIÓN
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid(); -- Generar UUID aleatorio
    test_product_id UUID;
    result_record RECORD;
    product_name_test TEXT;
BEGIN
    -- Obtener un producto del día disponible
    SELECT id, name INTO test_product_id, product_name_test
    FROM public.daily_products 
    WHERE stock_quantity > 0 
    AND expires_at > NOW()
    LIMIT 1;
    
    IF test_product_id IS NOT NULL THEN
        RAISE NOTICE '🧪 PROBANDO con producto: % (ID: %)', product_name_test, test_product_id;
        
        -- Ejecutar función
        FOR result_record IN 
            SELECT * FROM public.add_to_cart_safe(test_user_id, test_product_id, 1, 'daily')
        LOOP
            RAISE NOTICE '🎯 RESULTADO FINAL: success=%, message=%', result_record.success, result_record.message;
        END LOOP;
        
        -- Verificar que se insertó en cart_items
        IF EXISTS (SELECT 1 FROM public.cart_items WHERE user_id = test_user_id AND product_id = test_product_id) THEN
            RAISE NOTICE '✅ CONFIRMADO: Producto insertado en cart_items correctamente';
        ELSE
            RAISE NOTICE '❌ ERROR: Producto no se insertó en cart_items';
        END IF;
        
        -- Limpiar la prueba
        DELETE FROM public.cart_items WHERE user_id = test_user_id;
        RAISE NOTICE '🧹 Prueba limpiada';
        
    ELSE
        RAISE NOTICE '⚠️ NO hay productos del día disponibles para probar';
    END IF;
END $$;

SELECT '🎉 VERIFICACIÓN COMPLETA - Revisa los resultados arriba' as resultado;
