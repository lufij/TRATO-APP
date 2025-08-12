-- =====================================================
-- TEST RÁPIDO PARA VERIFICAR QUE TODO FUNCIONA
-- =====================================================
-- Ejecuta este script DESPUÉS de fix_all_foreign_key_errors_final.sql
-- para confirmar que no hay errores y todo está operativo

SELECT 'INICIANDO TESTS DE VERIFICACIÓN FINAL' as test_status;

-- =====================================================
-- TEST 1: VERIFICAR FOREIGN KEYS DE ORDERS
-- =====================================================

WITH orders_fk_test AS (
    SELECT 
        kcu.column_name,
        ccu.table_name as referenced_table,
        tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'orders' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id')
)
SELECT 
    'TEST 1: ORDERS FOREIGN KEYS' as test_name,
    CASE 
        WHEN COUNT(*) = 3 THEN 'PASÓ ✅'
        ELSE format('FALLÓ ❌ - Solo %s de 3 FKs encontrados', COUNT(*))
    END as resultado,
    string_agg(column_name || ' → ' || referenced_table, ', ') as foreign_keys_creados
FROM orders_fk_test;

-- =====================================================
-- TEST 2: VERIFICAR QUE CART NO TIENE FKS PROBLEMÁTICOS
-- =====================================================

WITH cart_bad_fk_test AS (
    SELECT COUNT(*) as bad_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_id'
)
SELECT 
    'TEST 2: CART SIN FKS PROBLEMÁTICOS' as test_name,
    CASE 
        WHEN bad_fk_count = 0 THEN 'PASÓ ✅'
        ELSE format('FALLÓ ❌ - Aún hay %s FK problemático', bad_fk_count)
    END as resultado,
    format('%s constraints product_id (debe ser 0)', bad_fk_count) as detalle
FROM cart_bad_fk_test;

-- =====================================================
-- TEST 3: VERIFICAR FUNCIONES DE CARRITO CREADAS
-- =====================================================

WITH cart_functions_test AS (
    SELECT 
        COUNT(*) as function_count,
        string_agg(proname, ', ') as functions_found
    FROM pg_proc 
    WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items')
)
SELECT 
    'TEST 3: FUNCIONES DE CARRITO' as test_name,
    CASE 
        WHEN function_count = 3 THEN 'PASÓ ✅'
        ELSE format('FALLÓ ❌ - Solo %s de 3 funciones encontradas', function_count)
    END as resultado,
    functions_found as funciones_creadas
FROM cart_functions_test;

-- =====================================================
-- TEST 4: VERIFICAR COLUMNAS NUEVAS EN CART_ITEMS
-- =====================================================

WITH cart_columns_test AS (
    SELECT 
        COUNT(*) as column_count,
        string_agg(column_name, ', ') as columns_found
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cart_items'
    AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id')
)
SELECT 
    'TEST 4: COLUMNAS NUEVAS EN CART' as test_name,
    CASE 
        WHEN column_count = 5 THEN 'PASÓ ✅'
        ELSE format('FALLÓ ❌ - Solo %s de 5 columnas encontradas', column_count)
    END as resultado,
    columns_found as columnas_agregadas
FROM cart_columns_test;

-- =====================================================
-- TEST 5: VERIFICAR TABLAS DEL SISTEMA ORDERS
-- =====================================================

WITH orders_tables_test AS (
    SELECT 
        COUNT(*) as table_count,
        string_agg(table_name, ', ') as tables_found
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('orders', 'order_items', 'notifications', 'reviews')
)
SELECT 
    'TEST 5: TABLAS DEL SISTEMA ORDERS' as test_name,
    CASE 
        WHEN table_count = 4 THEN 'PASÓ ✅'
        ELSE format('FALLÓ ❌ - Solo %s de 4 tablas encontradas', table_count)
    END as resultado,
    tables_found as tablas_existentes
FROM orders_tables_test;

-- =====================================================
-- TEST 6: PROBAR FUNCIÓN ADD_TO_CART_SAFE
-- =====================================================

DO $$
DECLARE
    test_result RECORD;
    test_user_id UUID;
    function_exists BOOLEAN := false;
BEGIN
    -- Verificar si la función existe
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'add_to_cart_safe'
    ) INTO function_exists;
    
    IF function_exists THEN
        -- Obtener un usuario existente para probar
        SELECT id INTO test_user_id FROM public.users LIMIT 1;
        
        IF test_user_id IS NOT NULL THEN
            -- Probar la función con un producto inexistente (debería fallar elegantemente)
            SELECT * INTO test_result 
            FROM add_to_cart_safe(
                test_user_id, 
                '00000000-0000-0000-0000-000000000000'::UUID, 
                1, 
                'regular'
            );
            
            IF test_result.success = false THEN
                RAISE NOTICE 'TEST 6: FUNCIÓN ADD_TO_CART_SAFE - PASÓ ✅ - Rechaza productos inexistentes correctamente';
            ELSE
                RAISE NOTICE 'TEST 6: FUNCIÓN ADD_TO_CART_SAFE - FALLÓ ❌ - No valida correctamente productos inexistentes';
            END IF;
        ELSE
            RAISE NOTICE 'TEST 6: FUNCIÓN ADD_TO_CART_SAFE - SALTADO ⚠️ - No hay usuarios para probar';
        END IF;
    ELSE
        RAISE NOTICE 'TEST 6: FUNCIÓN ADD_TO_CART_SAFE - FALLÓ ❌ - Función no existe';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'TEST 6: FUNCIÓN ADD_TO_CART_SAFE - ERROR ❌ - %', SQLERRM;
END $$;

-- =====================================================
-- TEST 7: VERIFICAR POLÍTICAS RLS
-- =====================================================

WITH rls_test AS (
    SELECT 
        schemaname,
        tablename,
        policyname,
        COUNT(*) OVER (PARTITION BY tablename) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('orders', 'cart_items')
)
SELECT 
    'TEST 7: POLÍTICAS RLS' as test_name,
    CASE 
        WHEN COUNT(DISTINCT tablename) >= 2 THEN 'PASÓ ✅'
        ELSE 'FALLÓ ❌ - Faltan políticas RLS'
    END as resultado,
    format('%s políticas en %s tablas', COUNT(*), COUNT(DISTINCT tablename)) as detalle
FROM rls_test;

-- =====================================================
-- TEST 8: VERIFICAR ÍNDICES CREADOS
-- =====================================================

WITH indexes_test AS (
    SELECT 
        COUNT(*) as index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND (
        (tablename = 'orders' AND indexname LIKE 'idx_orders_%') OR
        (tablename = 'cart_items' AND indexname LIKE 'idx_cart_items_%')
    )
)
SELECT 
    'TEST 8: ÍNDICES DE OPTIMIZACIÓN' as test_name,
    CASE 
        WHEN index_count >= 6 THEN 'PASÓ ✅'
        ELSE format('PARCIAL ⚠️ - Solo %s índices encontrados', index_count)
    END as resultado,
    format('%s índices de optimización creados', index_count) as detalle
FROM indexes_test;

-- =====================================================
-- RESULTADO CONSOLIDADO FINAL
-- =====================================================

WITH final_test_summary AS (
    SELECT 
        -- Test 1: Orders FKs
        (SELECT COUNT(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'orders' AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id')) as orders_fks,
        
        -- Test 2: Cart bad FKs
        (SELECT COUNT(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'product_id') as cart_bad_fks,
        
        -- Test 3: Functions
        (SELECT COUNT(*) FROM pg_proc 
         WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items')) as functions_count,
        
        -- Test 4: Columns
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'cart_items'
         AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id')) as new_columns,
        
        -- Test 5: Tables
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name IN ('orders', 'order_items', 'notifications', 'reviews')) as orders_tables
)
SELECT 
    'RESULTADO FINAL DE TODOS LOS TESTS' as categoria,
    CASE 
        WHEN orders_fks = 3 AND cart_bad_fks = 0 AND functions_count = 3 
             AND new_columns = 5 AND orders_tables = 4 THEN
            'TODOS LOS TESTS PASARON ✅🎉'
        WHEN orders_fks = 3 AND cart_bad_fks = 0 AND functions_count = 3 THEN
            'TESTS CRÍTICOS PASARON ✅ - Algunos menores pendientes'
        ELSE
            'ALGUNOS TESTS FALLARON ❌ - Revisar detalles arriba'
    END as estado_general,
    format('Orders FKs: %s/3 | Cart bad FKs: %s/0 | Functions: %s/3 | Columns: %s/5 | Tables: %s/4', 
           orders_fks, cart_bad_fks, functions_count, new_columns, orders_tables) as puntuacion_detallada
FROM final_test_summary;

-- =====================================================
-- INSTRUCCIONES FINALES BASADAS EN RESULTADOS
-- =====================================================

DO $$
DECLARE
    orders_fks INTEGER;
    cart_bad_fks INTEGER; 
    functions_count INTEGER;
    all_critical_passed BOOLEAN;
BEGIN
    -- Obtener métricas críticas
    SELECT COUNT(*) INTO orders_fks
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'orders' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id');
    
    SELECT COUNT(*) INTO cart_bad_fks
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_id';
    
    SELECT COUNT(*) INTO functions_count
    FROM pg_proc 
    WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items');
    
    all_critical_passed := (orders_fks = 3 AND cart_bad_fks = 0 AND functions_count = 3);
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'INSTRUCCIONES FINALES PERSONALIZADAS';
    RAISE NOTICE '================================================';
    
    IF all_critical_passed THEN
        RAISE NOTICE 'ÉXITO COMPLETO - Todos los tests críticos pasaron';
        RAISE NOTICE '';
        RAISE NOTICE 'PRÓXIMOS PASOS:';
        RAISE NOTICE '1. Ve a Supabase Dashboard → Database → Replication';
        RAISE NOTICE '2. Activa Realtime para: orders, notifications';
        RAISE NOTICE '3. Reinicia tu aplicación con Ctrl+Shift+R';
        RAISE NOTICE '4. Prueba agregar productos al carrito';
        RAISE NOTICE '5. Verifica que aparecen toasts de éxito/error';
        RAISE NOTICE '';
        RAISE NOTICE 'Tu marketplace TRATO está 100%% operativo! 🎉';
    ELSE
        RAISE NOTICE 'ATENCIÓN - Algunos tests críticos fallaron';
        RAISE NOTICE '';
        RAISE NOTICE 'PROBLEMAS DETECTADOS:';
        IF orders_fks != 3 THEN
            RAISE NOTICE '❌ Orders foreign keys: % de 3 (faltan algunos)', orders_fks;
        END IF;
        IF cart_bad_fks != 0 THEN
            RAISE NOTICE '❌ Cart tiene % constraints problemáticos (debe ser 0)', cart_bad_fks;
        END IF;
        IF functions_count != 3 THEN
            RAISE NOTICE '❌ Solo % de 3 funciones creadas', functions_count;
        END IF;
        RAISE NOTICE '';
        RAISE NOTICE 'SOLUCIÓN:';
        RAISE NOTICE '1. Re-ejecuta fix_all_foreign_key_errors_final.sql COMPLETO';
        RAISE NOTICE '2. Verifica que no hay errores rojos en el SQL Editor';
        RAISE NOTICE '3. Ejecuta este test nuevamente';
    END IF;
    
    RAISE NOTICE '================================================';
END $$;

SELECT 'TESTS DE VERIFICACIÓN COMPLETADOS - Ver resultados arriba' as final_status;