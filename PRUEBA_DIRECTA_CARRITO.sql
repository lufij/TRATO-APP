-- =====================================================
-- PRUEBA DIRECTA DE LA FUNCIÓN - PRODUCTOS DEL DÍA
-- =====================================================
-- Ejecutar para ver logs detallados

-- 🔍 PASO 1: Ver productos del día disponibles
SELECT 
    '📦 PRODUCTOS DEL DÍA ACTUALES:' as info,
    id,
    name,
    stock_quantity,
    expires_at,
    EXTRACT(HOUR FROM (expires_at - NOW())) as horas_restantes,
    CASE 
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO' 
        ELSE '✅ DISPONIBLE'
    END as estado
FROM public.daily_products
ORDER BY expires_at;

-- 🧪 PASO 2: Probar función con producto específico
-- REEMPLAZA 'tu-user-id-aqui' con tu ID de usuario real
-- REEMPLAZA 'product-id-del-dia' con el ID del producto del día

DO $$
DECLARE
    test_user_id UUID := 'a0ebc999-9c0b-4ef8-bb6d-6bb9bd380a11'; -- Cambia este UUID por tu user ID
    test_product_id UUID;
    result_record RECORD;
BEGIN
    -- Obtener el primer producto del día disponible
    SELECT id INTO test_product_id 
    FROM public.daily_products 
    WHERE stock_quantity > 0 
    AND expires_at > NOW()
    ORDER BY expires_at
    LIMIT 1;
    
    IF test_product_id IS NOT NULL THEN
        RAISE NOTICE '🧪 PROBANDO con producto del día ID: %', test_product_id;
        
        -- Ejecutar la función y mostrar resultado
        FOR result_record IN 
            SELECT * FROM public.add_to_cart_safe(test_user_id, test_product_id, 1, 'daily')
        LOOP
            RAISE NOTICE '✅ RESULTADO: success=%, message=%', result_record.success, result_record.message;
        END LOOP;
        
        -- Limpiar la prueba
        DELETE FROM public.cart_items WHERE user_id = test_user_id AND product_id = test_product_id;
        RAISE NOTICE '🧹 Prueba limpiada';
        
    ELSE
        RAISE NOTICE '❌ NO hay productos del día disponibles para probar';
    END IF;
END $$;

-- 🔍 PASO 3: Verificar estructura de cart_items
SELECT 
    '🗂️ ESTRUCTURA CART_ITEMS:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;
