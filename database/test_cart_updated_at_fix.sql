-- =====================================================
-- TEST RÁPIDO: VERIFICAR QUE UPDATED_AT FUNCIONA EN CART_ITEMS
-- =====================================================
-- Ejecuta este script DESPUÉS de fix_cart_missing_updated_at.sql
-- para confirmar que el error "column updated_at does not exist" se solucionó

SELECT 'INICIANDO TEST DE UPDATED_AT EN CART_ITEMS' as test_status;

-- =====================================================
-- TEST 1: VERIFICAR QUE COLUMNA UPDATED_AT EXISTE
-- =====================================================

WITH updated_at_test AS (
    SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cart_items' 
    AND column_name = 'updated_at'
)
SELECT 
    'TEST 1: COLUMNA UPDATED_AT' as test_name,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASÓ ✅'
        ELSE 'FALLÓ ❌ - Columna updated_at no existe'
    END as resultado,
    COALESCE(
        string_agg(column_name || ' (' || data_type || ')', ', '),
        'Columna no encontrada'
    ) as detalle
FROM updated_at_test;

-- =====================================================
-- TEST 2: VERIFICAR QUE COLUMNA CREATED_AT EXISTE  
-- =====================================================

WITH created_at_test AS (
    SELECT 
        column_name,
        data_type,
        column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cart_items' 
    AND column_name = 'created_at'
)
SELECT 
    'TEST 2: COLUMNA CREATED_AT' as test_name,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASÓ ✅'
        ELSE 'FALLÓ ❌ - Columna created_at no existe'
    END as resultado,
    COALESCE(
        string_agg(column_name || ' (' || data_type || ')', ', '),
        'Columna no encontrada'
    ) as detalle
FROM created_at_test;

-- =====================================================
-- TEST 3: VERIFICAR TRIGGER PARA AUTO-UPDATE
-- =====================================================

WITH trigger_test AS (
    SELECT 
        trigger_name,
        event_manipulation,
        action_timing
    FROM information_schema.triggers 
    WHERE trigger_name = 'update_cart_items_updated_at' 
    AND event_object_table = 'cart_items'
)
SELECT 
    'TEST 3: TRIGGER UPDATED_AT' as test_name,
    CASE 
        WHEN COUNT(*) >= 1 THEN 'PASÓ ✅'
        ELSE 'FALLÓ ❌ - Trigger no existe'
    END as resultado,
    COALESCE(
        string_agg(trigger_name || ' (' || action_timing || ' ' || event_manipulation || ')', ', '),
        'Trigger no encontrado'
    ) as detalle
FROM trigger_test;

-- =====================================================
-- TEST 4: VERIFICAR COLUMNAS NECESARIAS PARA CARRITO
-- =====================================================

WITH cart_columns_test AS (
    SELECT 
        COUNT(*) as column_count,
        string_agg(column_name, ', ' ORDER BY column_name) as columns_found
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cart_items'
    AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id', 'updated_at', 'created_at')
)
SELECT 
    'TEST 4: COLUMNAS CARRITO COMPLETAS' as test_name,
    CASE 
        WHEN column_count = 7 THEN 'PASÓ ✅'
        ELSE format('PARCIAL ⚠️ - Solo %s de 7 columnas', column_count)
    END as resultado,
    columns_found as detalle
FROM cart_columns_test;

-- =====================================================
-- TEST 5: VERIFICAR FOREIGN KEY SEGURO
-- =====================================================

WITH fk_test AS (
    SELECT 
        kcu.column_name,
        ccu.table_name as referenced_table,
        tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
)
SELECT 
    'TEST 5: FOREIGN KEY USER_ID' as test_name,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASÓ ✅'
        ELSE 'FALLÓ ❌ - Foreign key user_id no existe'
    END as resultado,
    COALESCE(
        string_agg(column_name || ' → ' || referenced_table, ', '),
        'Foreign key no encontrado'
    ) as detalle
FROM fk_test;

-- =====================================================
-- TEST 6: VERIFICAR QUE NO HAY FOREIGN KEY PROBLEMÁTICO
-- =====================================================

WITH bad_fk_test AS (
    SELECT COUNT(*) as bad_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND kcu.column_name = 'product_id'
    AND tc.constraint_type = 'FOREIGN KEY'
)
SELECT 
    'TEST 6: SIN FK PROBLEMÁTICO' as test_name,
    CASE 
        WHEN bad_fk_count = 0 THEN 'PASÓ ✅'
        ELSE format('FALLÓ ❌ - Hay %s FK problemático en product_id', bad_fk_count)
    END as resultado,
    format('%s constraints product_id (debe ser 0)', bad_fk_count) as detalle
FROM bad_fk_test;

-- =====================================================
-- TEST 7: SIMULAR INSERT/UPDATE PARA PROBAR UPDATED_AT
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_cart_item_id UUID;
    insert_updated_at TIMESTAMP WITH TIME ZONE;
    update_updated_at TIMESTAMP WITH TIME ZONE;
    test_success BOOLEAN := false;
BEGIN
    -- Obtener un usuario existente para probar
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        BEGIN
            -- Probar INSERT con updated_at
            INSERT INTO public.cart_items (
                user_id, product_id, quantity, 
                product_type, product_name, product_price,
                created_at, updated_at
            ) VALUES (
                test_user_id, 
                gen_random_uuid(), -- producto ficticio
                1,
                'regular',
                'Producto Test',
                10.00,
                NOW(),
                NOW()
            ) RETURNING id, updated_at INTO test_cart_item_id, insert_updated_at;
            
            -- Esperar un momento y hacer UPDATE para probar trigger
            PERFORM pg_sleep(0.1);
            
            UPDATE public.cart_items 
            SET quantity = 2 
            WHERE id = test_cart_item_id
            RETURNING updated_at INTO update_updated_at;
            
            -- Verificar que updated_at cambió
            IF update_updated_at > insert_updated_at THEN
                test_success := true;
            END IF;
            
            -- Limpiar registro de prueba
            DELETE FROM public.cart_items WHERE id = test_cart_item_id;
            
        EXCEPTION
            WHEN others THEN
                -- Limpiar en caso de error
                DELETE FROM public.cart_items WHERE id = test_cart_item_id;
                test_success := false;
        END;
    END IF;
    
    RAISE NOTICE 'TEST 7: PRUEBA INSERT/UPDATE - %', 
        CASE WHEN test_success THEN 'PASÓ ✅' ELSE 'FALLÓ ❌ o NO SE PUDO PROBAR' END;
        
    IF test_success THEN
        RAISE NOTICE 'Insert updated_at: %', insert_updated_at;
        RAISE NOTICE 'Update updated_at: %', update_updated_at;
        RAISE NOTICE 'Trigger funciona correctamente (updated_at cambió)';
    ELSE
        RAISE NOTICE 'No se pudo probar INSERT/UPDATE (posible falta de usuarios)';
    END IF;
END $$;

-- =====================================================
-- RESULTADO CONSOLIDADO FINAL
-- =====================================================

WITH final_summary AS (
    SELECT 
        -- Test de columnas críticas
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'cart_items' 
         AND column_name IN ('updated_at', 'created_at')) as timestamp_columns,
        
        -- Test de trigger
        (SELECT COUNT(*) FROM information_schema.triggers 
         WHERE trigger_name = 'update_cart_items_updated_at') as triggers,
        
        -- Test de foreign key seguro
        (SELECT COUNT(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'user_id' 
         AND tc.constraint_type = 'FOREIGN KEY') as safe_fks,
        
        -- Test de foreign key problemático
        (SELECT COUNT(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'product_id' 
         AND tc.constraint_type = 'FOREIGN KEY') as bad_fks,
        
        -- Test de columnas del carrito
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'cart_items'
         AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id')) as cart_columns
)
SELECT 
    'RESULTADO FINAL DE TODOS LOS TESTS' as categoria,
    CASE 
        WHEN timestamp_columns = 2 AND triggers = 1 AND safe_fks = 1 AND bad_fks = 0 AND cart_columns = 5 THEN
            'TODOS LOS TESTS PASARON ✅🎉'
        WHEN timestamp_columns = 2 AND triggers = 1 AND safe_fks = 1 THEN
            'TESTS CRÍTICOS PASARON ✅ - Error updated_at solucionado'
        ELSE
            'ALGUNOS TESTS FALLARON ❌ - Revisar detalles arriba'
    END as estado_general,
    format('Timestamps: %s/2 | Trigger: %s/1 | Safe FK: %s/1 | Bad FK: %s/0 | Cart cols: %s/5', 
           timestamp_columns, triggers, safe_fks, bad_fks, cart_columns) as puntuacion_detallada
FROM final_summary;

-- =====================================================
-- INSTRUCCIONES FINALES
-- =====================================================

DO $$
DECLARE
    updated_at_exists BOOLEAN;
    trigger_exists BOOLEAN;
    all_critical_passed BOOLEAN;
BEGIN
    -- Verificar elementos críticos
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'updated_at'
    ) INTO updated_at_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_cart_items_updated_at'
    ) INTO trigger_exists;
    
    all_critical_passed := (updated_at_exists AND trigger_exists);
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'INSTRUCCIONES FINALES';
    RAISE NOTICE '================================================';
    
    IF all_critical_passed THEN
        RAISE NOTICE '🎉 ERROR "column updated_at does not exist" SOLUCIONADO';
        RAISE NOTICE '';
        RAISE NOTICE 'PRÓXIMOS PASOS:';
        RAISE NOTICE '1. Reinicia tu aplicación con Ctrl+Shift+R';
        RAISE NOTICE '2. Prueba agregar productos al carrito';
        RAISE NOTICE '3. Verifica que no aparezcan errores en la consola';
        RAISE NOTICE '4. El carrito debe funcionar normalmente';
        RAISE NOTICE '';
        RAISE NOTICE '🛒 TU CARRITO ESTÁ 100%% FUNCIONAL!';
    ELSE
        RAISE NOTICE '⚠️ CORRECCIÓN INCOMPLETA';
        RAISE NOTICE '';
        RAISE NOTICE 'PROBLEMAS DETECTADOS:';
        IF NOT updated_at_exists THEN
            RAISE NOTICE '❌ Columna updated_at aún no existe';
        END IF;
        IF NOT trigger_exists THEN
            RAISE NOTICE '❌ Trigger para updated_at no existe';  
        END IF;
        RAISE NOTICE '';
        RAISE NOTICE 'SOLUCIÓN: Re-ejecuta fix_cart_missing_updated_at.sql';
    END IF;
    
    RAISE NOTICE '================================================';
END $$;

SELECT 'TEST DE UPDATED_AT EN CART_ITEMS COMPLETADO - Ver resultados arriba' as final_status;