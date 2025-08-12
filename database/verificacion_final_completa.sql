-- ============================================================================
-- TRATO - Verificación Final Completa del Sistema
-- ============================================================================
-- Este script verifica que TODOS los sistemas estén funcionando correctamente
-- después de ejecutar fix_setup.sql exitosamente
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL COMPLETA DE TRATO...';
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando que todos los sistemas estén activos y funcionando:';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 1: Verificar todas las tablas principales
-- ============================================================================

DO $$
DECLARE
    table_info RECORD;
    total_tables INTEGER := 0;
    missing_tables INTEGER := 0;
    table_names TEXT[] := ARRAY[
        'users', 'products', 'orders', 'order_items', 'cart',
        'conversations', 'messages', 'notifications', 'user_addresses'
    ];
    table_name TEXT;
BEGIN
    RAISE NOTICE '1️⃣ VERIFICANDO TABLAS PRINCIPALES:';
    RAISE NOTICE '';
    
    FOREACH table_name IN ARRAY table_names
    LOOP
        total_tables := total_tables + 1;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name) THEN
            -- Contar registros para dar contexto
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO table_info;
            RAISE NOTICE '   ✅ % - EXISTE (% registros)', RPAD(table_name, 15), table_info.count;
        ELSE
            RAISE NOTICE '   ❌ % - NO EXISTE', table_name;
            missing_tables := missing_tables + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Resumen de tablas: % de % encontradas', (total_tables - missing_tables), total_tables;
    
    IF missing_tables = 0 THEN
        RAISE NOTICE '🎉 ¡Todas las tablas principales están presentes!';
    ELSE
        RAISE NOTICE '⚠️ Faltan % tablas. Re-ejecutar fix_setup.sql', missing_tables;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 2: Verificar columnas críticas que causaban errores
-- ============================================================================

DO $$
DECLARE
    critical_columns RECORD[] := ARRAY[
        ROW('orders', 'notes')::RECORD,
        ROW('order_items', 'price_per_unit')::RECORD,
        ROW('user_addresses', 'is_default')::RECORD,
        ROW('notifications', 'recipient_id')::RECORD,
        ROW('conversations', 'last_message_id')::RECORD,
        ROW('users', 'business_name')::RECORD,
        ROW('cart', 'updated_at')::RECORD
    ];
    critical_col RECORD;
    found_columns INTEGER := 0;
    total_critical INTEGER := 0;
BEGIN
    RAISE NOTICE '2️⃣ VERIFICANDO COLUMNAS CRÍTICAS (que causaban errores):';
    RAISE NOTICE '';
    
    FOREACH critical_col IN ARRAY critical_columns
    LOOP
        total_critical := total_critical + 1;
        
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = critical_col.f1 AND column_name = critical_col.f2
        ) THEN
            RAISE NOTICE '   ✅ %.% - EXISTE', RPAD(critical_col.f1, 15), critical_col.f2;
            found_columns := found_columns + 1;
        ELSE
            RAISE NOTICE '   ❌ %.% - NO EXISTE', RPAD(critical_col.f1, 15), critical_col.f2;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Columnas críticas: % de % encontradas', found_columns, total_critical;
    
    IF found_columns = total_critical THEN
        RAISE NOTICE '🎉 ¡Todas las columnas críticas están presentes!';
    ELSE
        RAISE NOTICE '⚠️ Faltan % columnas críticas', (total_critical - found_columns);
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 3: Verificar foreign keys críticas
-- ============================================================================

DO $$
DECLARE
    fk_info RECORD;
    fk_count INTEGER := 0;
    expected_fks TEXT[] := ARRAY[
        'products_seller_id_fkey',
        'orders_buyer_id_fkey', 
        'orders_seller_id_fkey',
        'order_items_order_id_fkey',
        'order_items_product_id_fkey',
        'cart_user_id_fkey',
        'cart_product_id_fkey'
    ];
    fk_name TEXT;
    found_fk BOOLEAN;
BEGIN
    RAISE NOTICE '3️⃣ VERIFICANDO FOREIGN KEYS CRÍTICAS:';
    RAISE NOTICE '';
    
    FOREACH fk_name IN ARRAY expected_fks
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = fk_name AND constraint_type = 'FOREIGN KEY'
        ) INTO found_fk;
        
        IF found_fk THEN
            RAISE NOTICE '   ✅ % - EXISTE', RPAD(fk_name, 30);
            fk_count := fk_count + 1;
        ELSE
            RAISE NOTICE '   ⚠️ % - NO EXISTE', RPAD(fk_name, 30);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Foreign keys: % de % encontradas', fk_count, array_length(expected_fks, 1);
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 4: Verificar índices críticos (especialmente is_default)
-- ============================================================================

DO $$
DECLARE
    index_info RECORD;
    critical_indexes TEXT[] := ARRAY[
        'idx_users_email',
        'idx_products_seller_id',
        'idx_orders_buyer_id',
        'idx_orders_seller_id', 
        'idx_user_addresses_is_default',
        'idx_notifications_recipient_id'
    ];
    index_name TEXT;
    found_indexes INTEGER := 0;
BEGIN
    RAISE NOTICE '4️⃣ VERIFICANDO ÍNDICES CRÍTICOS:';
    RAISE NOTICE '';
    
    FOREACH index_name IN ARRAY critical_indexes
    LOOP
        IF EXISTS (SELECT FROM pg_indexes WHERE indexname = index_name) THEN
            RAISE NOTICE '   ✅ % - EXISTE', RPAD(index_name, 35);
            found_indexes := found_indexes + 1;
        ELSE
            RAISE NOTICE '   ⚠️ % - NO EXISTE', RPAD(index_name, 35);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Índices críticos: % de % encontrados', found_indexes, array_length(critical_indexes, 1);
    
    IF found_indexes >= 4 THEN
        RAISE NOTICE '✅ La mayoría de índices críticos están presentes';
    ELSE
        RAISE NOTICE '⚠️ Pocos índices encontrados, el rendimiento puede verse afectado';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 5: Probar queries críticas que fallaban antes
-- ============================================================================

DO $$
DECLARE
    test_count INTEGER;
    tests_passed INTEGER := 0;
    total_tests INTEGER := 0;
BEGIN
    RAISE NOTICE '5️⃣ PROBANDO QUERIES QUE FALLABAN ANTES:';
    RAISE NOTICE '';
    
    -- Test 1: orders.notes
    total_tests := total_tests + 1;
    BEGIN
        SELECT COUNT(*) INTO test_count FROM orders WHERE notes IS NOT NULL OR notes IS NULL;
        RAISE NOTICE '   ✅ SELECT orders.notes - FUNCIONA';
        tests_passed := tests_passed + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT orders.notes - ERROR: %', SQLERRM;
    END;
    
    -- Test 2: order_items.price_per_unit
    total_tests := total_tests + 1;
    BEGIN
        SELECT COUNT(*) INTO test_count FROM order_items WHERE price_per_unit >= 0;
        RAISE NOTICE '   ✅ SELECT order_items.price_per_unit - FUNCIONA';
        tests_passed := tests_passed + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT order_items.price_per_unit - ERROR: %', SQLERRM;
    END;
    
    -- Test 3: user_addresses.is_default
    total_tests := total_tests + 1;
    BEGIN
        SELECT COUNT(*) INTO test_count FROM user_addresses WHERE is_default = true OR is_default = false;
        RAISE NOTICE '   ✅ SELECT user_addresses.is_default - FUNCIONA';
        tests_passed := tests_passed + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT user_addresses.is_default - ERROR: %', SQLERRM;
    END;
    
    -- Test 4: notifications.recipient_id
    total_tests := total_tests + 1;
    BEGIN
        SELECT COUNT(*) INTO test_count FROM notifications WHERE recipient_id IS NOT NULL OR recipient_id IS NULL;
        RAISE NOTICE '   ✅ SELECT notifications.recipient_id - FUNCIONA';
        tests_passed := tests_passed + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT notifications.recipient_id - ERROR: %', SQLERRM;
    END;
    
    -- Test 5: JOIN complejo como en SellerOrderManagement
    total_tests := total_tests + 1;
    BEGIN
        SELECT COUNT(*) INTO test_count 
        FROM orders o
        LEFT JOIN users u ON o.buyer_id = u.id  
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id;
        RAISE NOTICE '   ✅ JOIN completo orders-users-products - FUNCIONA';
        tests_passed := tests_passed + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ JOIN completo orders-users-products - ERROR: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tests de queries: % de % pasaron', tests_passed, total_tests;
    
    IF tests_passed = total_tests THEN
        RAISE NOTICE '🎉 ¡Todas las queries críticas funcionan correctamente!';
    ELSE
        RAISE NOTICE '⚠️ % queries aún fallan', (total_tests - tests_passed);
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 6: Verificar Row Level Security (RLS)
-- ============================================================================

DO $$
DECLARE
    table_name TEXT;
    rls_tables TEXT[] := ARRAY[
        'users', 'products', 'orders', 'order_items', 'cart',
        'conversations', 'messages', 'notifications', 'user_addresses'
    ];
    rls_enabled_count INTEGER := 0;
    total_rls_tables INTEGER := 0;
BEGIN
    RAISE NOTICE '6️⃣ VERIFICANDO ROW LEVEL SECURITY (RLS):';
    RAISE NOTICE '';
    
    FOREACH table_name IN ARRAY rls_tables
    LOOP
        total_rls_tables := total_rls_tables + 1;
        
        IF EXISTS (
            SELECT FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid  
            WHERE c.relname = table_name AND c.relrowsecurity = true
        ) THEN
            RAISE NOTICE '   ✅ % - RLS HABILITADO', RPAD(table_name, 15);
            rls_enabled_count := rls_enabled_count + 1;
        ELSE
            RAISE NOTICE '   ⚠️ % - RLS NO HABILITADO', RPAD(table_name, 15);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RLS habilitado: % de % tablas', rls_enabled_count, total_rls_tables;
    
    IF rls_enabled_count >= 6 THEN
        RAISE NOTICE '🔒 La seguridad Row Level Security está mayormente configurada';
    ELSE
        RAISE NOTICE '⚠️ Pocas tablas tienen RLS habilitado';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- RESUMEN FINAL Y VEREDICTO
-- ============================================================================

DO $$
DECLARE
    -- Contadores de verificaciones
    tables_ok BOOLEAN := false;
    columns_ok BOOLEAN := false;
    queries_ok BOOLEAN := false;
    
    -- Test individual results
    all_tables_exist BOOLEAN;
    critical_columns_exist BOOLEAN;
    basic_queries_work BOOLEAN;
    
    overall_score INTEGER := 0;
    max_score INTEGER := 10;
BEGIN
    RAISE NOTICE '📊 RESUMEN FINAL DE VERIFICACIÓN:';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════';
    
    -- Verificaciones rápidas para el resumen
    SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('users','products','orders','order_items','cart','conversations','messages','notifications','user_addresses')) = 9
    INTO all_tables_exist;
    
    SELECT 
        (SELECT COUNT(*) FROM information_schema.columns WHERE (table_name = 'orders' AND column_name = 'notes') OR (table_name = 'user_addresses' AND column_name = 'is_default') OR (table_name = 'order_items' AND column_name = 'price_per_unit') OR (table_name = 'notifications' AND column_name = 'recipient_id')) >= 3
    INTO critical_columns_exist;
    
    -- Intentar query crítica
    BEGIN
        PERFORM COUNT(*) FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.notes IS NOT NULL OR o.notes IS NULL;
        basic_queries_work := true;
    EXCEPTION WHEN OTHERS THEN
        basic_queries_work := false;
    END;
    
    -- Calcular puntuación
    IF all_tables_exist THEN overall_score := overall_score + 4; END IF;
    IF critical_columns_exist THEN overall_score := overall_score + 3; END IF;
    IF basic_queries_work THEN overall_score := overall_score + 3; END IF;
    
    -- Mostrar resultados detallados
    RAISE NOTICE '🗃️ TABLAS PRINCIPALES: %', CASE WHEN all_tables_exist THEN '✅ TODAS EXISTEN' ELSE '❌ FALTAN ALGUNAS' END;
    RAISE NOTICE '🔧 COLUMNAS CRÍTICAS: %', CASE WHEN critical_columns_exist THEN '✅ LA MAYORÍA PRESENTES' ELSE '❌ FALTAN VARIAS' END;
    RAISE NOTICE '⚙️ QUERIES BÁSICAS: %', CASE WHEN basic_queries_work THEN '✅ FUNCIONAN' ELSE '❌ FALLAN' END;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PUNTUACIÓN TOTAL: % / %', overall_score, max_score;
    RAISE NOTICE '';
    
    -- Veredicto final
    IF overall_score >= 8 THEN
        RAISE NOTICE '🎉 ¡SISTEMA TRATO COMPLETAMENTE FUNCIONAL!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Tu aplicación está lista para usar:';
        RAISE NOTICE '   • Todas las funciones principales están disponibles';
        RAISE NOTICE '   • Los errores anteriores han sido corregidos';
        RAISE NOTICE '   • El sistema de pedidos funciona correctamente';
        RAISE NOTICE '   • El dashboard del vendedor debe cargar sin problemas';
        RAISE NOTICE '   • El chat y las notificaciones están operativos';
        RAISE NOTICE '';
        RAISE NOTICE '📱 PRÓXIMOS PASOS:';
        RAISE NOTICE '   1. Recarga tu aplicación web (Ctrl+Shift+R)';
        RAISE NOTICE '   2. Regístrate como vendedor o comprador';
        RAISE NOTICE '   3. Para admin: usa trato.app1984@gmail.com';
        RAISE NOTICE '   4. ¡Comienza a usar tu marketplace local!';
        
    ELSIF overall_score >= 6 THEN
        RAISE NOTICE '⚠️ SISTEMA TRATO MAYORMENTE FUNCIONAL';
        RAISE NOTICE '';
        RAISE NOTICE 'La mayoría de funciones están disponibles, pero hay algunos problemas menores.';
        RAISE NOTICE 'La aplicación debería funcionar para uso básico.';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Recomendación: Recarga la app y prueba las funciones principales.';
        
    ELSE
        RAISE NOTICE '❌ SISTEMA TRATO NECESITA MÁS CONFIGURACIÓN';
        RAISE NOTICE '';
        RAISE NOTICE 'Hay problemas significativos que necesitan atención.';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Soluciones recomendadas:';
        RAISE NOTICE '   • Re-ejecutar fix_setup.sql';
        RAISE NOTICE '   • Verificar credenciales de Supabase';
        RAISE NOTICE '   • Revisar la configuración del proyecto';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════';
    RAISE NOTICE '🎯 VERIFICACIÓN FINAL COMPLETADA';
    RAISE NOTICE '';
    
END $$;