-- ============================================================================
-- TRATO - Verificación Específica para Error order_items.price_per_unit
-- ============================================================================
-- Este script verifica que el error específico esté corregido:
-- ERROR: column order_items_1.price_per_unit does not exist
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO CORRECCIÓN DEL ERROR order_items.price_per_unit...';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 1: Verificar estructura de tabla order_items
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    column_info RECORD;
    column_count INTEGER := 0;
BEGIN
    RAISE NOTICE '1️⃣ VERIFICANDO ESTRUCTURA DE TABLA order_items:';
    
    -- Verificar si la tabla existe
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') 
    INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '   ✅ Tabla order_items: EXISTE';
        
        -- Contar columnas
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_name = 'order_items';
        
        RAISE NOTICE '   📊 Total de columnas: %', column_count;
        
        -- Listar todas las columnas con sus tipos
        RAISE NOTICE '   📋 Estructura de columnas:';
        FOR column_info IN
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'order_items'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '      • %: % (nullable: %, default: %)', 
                column_info.column_name, 
                column_info.data_type, 
                column_info.is_nullable,
                COALESCE(column_info.column_default, 'none');
        END LOOP;
        
    ELSE
        RAISE NOTICE '   ❌ Tabla order_items: NO EXISTE';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 2: Verificar columnas específicas críticas
-- ============================================================================

DO $$
DECLARE
    critical_columns TEXT[] := ARRAY['price_per_unit', 'total_price', 'quantity', 'order_id', 'product_id'];
    col TEXT;
    exists_check BOOLEAN;
    all_critical_exist BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '2️⃣ VERIFICANDO COLUMNAS CRÍTICAS:';
    
    FOREACH col IN ARRAY critical_columns
    LOOP
        SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = col) 
        INTO exists_check;
        
        IF exists_check THEN
            RAISE NOTICE '   ✅ Columna %: EXISTE', col;
        ELSE
            RAISE NOTICE '   ❌ Columna %: NO EXISTE', col;
            all_critical_exist := FALSE;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF all_critical_exist THEN
        RAISE NOTICE '   🎉 Todas las columnas críticas están presentes';
    ELSE
        RAISE NOTICE '   ⚠️ Faltan columnas críticas - ejecutar fix_order_items_columns.sql';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 3: Verificar foreign keys de order_items
-- ============================================================================

DO $$
DECLARE
    fk_info RECORD;
    fk_count INTEGER := 0;
BEGIN
    RAISE NOTICE '3️⃣ VERIFICANDO FOREIGN KEYS DE order_items:';
    
    FOR fk_info IN
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            rc.delete_rule,
            rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc 
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'order_items' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        fk_count := fk_count + 1;
        RAISE NOTICE '   FK %: % (columna: %, delete: %)', 
            fk_count, fk_info.constraint_name, fk_info.column_name, fk_info.delete_rule;
    END LOOP;
    
    IF fk_count = 0 THEN
        RAISE NOTICE '   ⚠️ No se encontraron foreign keys en order_items';
        RAISE NOTICE '   💡 Esto puede indicar que faltan relaciones con orders y products';
    ELSE
        RAISE NOTICE '   ✅ Total de foreign keys: %', fk_count;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 4: Probar queries que estaban fallando
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '4️⃣ PROBANDO QUERIES QUE ESTABAN FALLANDO:';
    
    -- Test 1: SELECT básico de order_items
    BEGIN
        PERFORM COUNT(*) FROM order_items;
        RAISE NOTICE '   ✅ SELECT COUNT(*) FROM order_items: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT COUNT(*) FROM order_items: ERROR - %', SQLERRM;
    END;
    
    -- Test 2: SELECT con price_per_unit específicamente
    BEGIN
        PERFORM price_per_unit FROM order_items LIMIT 1;
        RAISE NOTICE '   ✅ SELECT price_per_unit FROM order_items: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT price_per_unit FROM order_items: ERROR - %', SQLERRM;
    END;
    
    -- Test 3: SELECT con todas las columnas críticas
    BEGIN
        PERFORM price_per_unit, total_price, quantity, order_id, product_id FROM order_items LIMIT 1;
        RAISE NOTICE '   ✅ SELECT columnas críticas FROM order_items: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT columnas críticas FROM order_items: ERROR - %', SQLERRM;
    END;
    
    -- Test 4: JOIN con orders (query típica del sistema)
    BEGIN
        PERFORM COUNT(*)
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id;
        RAISE NOTICE '   ✅ JOIN order_items ↔ orders: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ JOIN order_items ↔ orders: ERROR - %', SQLERRM;
    END;
    
    -- Test 5: JOIN con products (query típica del sistema)
    BEGIN
        PERFORM COUNT(*)
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id;
        RAISE NOTICE '   ✅ JOIN order_items ↔ products: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ JOIN order_items ↔ products: ERROR - %', SQLERRM;
    END;
    
    -- Test 6: Query completa típica del dashboard vendedor
    BEGIN
        PERFORM 
            oi.id,
            oi.quantity,
            oi.price_per_unit,
            oi.total_price,
            o.status,
            p.name
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        LIMIT 1;
        RAISE NOTICE '   ✅ Query completa de dashboard: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Query completa de dashboard: ERROR - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 5: Verificar índices y rendimiento
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER := 0;
    index_names TEXT;
BEGIN
    RAISE NOTICE '5️⃣ VERIFICANDO ÍNDICES Y RENDIMIENTO:';
    
    -- Contar índices
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE tablename = 'order_items';
    
    IF index_count > 0 THEN
        RAISE NOTICE '   ✅ Tabla order_items tiene % índices', index_count;
        
        -- Listar nombres de índices
        SELECT string_agg(indexname, ', ') INTO index_names
        FROM pg_indexes 
        WHERE tablename = 'order_items';
        
        RAISE NOTICE '   📋 Índices: %', index_names;
    ELSE
        RAISE NOTICE '   ⚠️ Tabla order_items no tiene índices (puede afectar rendimiento)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 6: Verificar Row Level Security
-- ============================================================================

DO $$
DECLARE
    rls_enabled BOOLEAN := FALSE;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '6️⃣ VERIFICANDO ROW LEVEL SECURITY:';
    
    -- Verificar si RLS está habilitado
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'order_items';
    
    IF rls_enabled THEN
        RAISE NOTICE '   ✅ RLS habilitado en order_items';
        
        -- Contar policies
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE tablename = 'order_items';
        
        RAISE NOTICE '   📊 Número de policies: %', policy_count;
        
        IF policy_count > 0 THEN
            RAISE NOTICE '   ✅ Policies configuradas para seguridad';
        ELSE
            RAISE NOTICE '   ⚠️ RLS habilitado pero sin policies (puede bloquear acceso)';
        END IF;
        
    ELSE
        RAISE NOTICE '   ⚠️ RLS no habilitado en order_items';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- RESUMEN FINAL DEL TEST
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    price_per_unit_exists BOOLEAN := FALSE;
    total_price_exists BOOLEAN := FALSE;
    quantity_exists BOOLEAN := FALSE;
    order_id_exists BOOLEAN := FALSE;
    product_id_exists BOOLEAN := FALSE;
    all_critical_exist BOOLEAN := FALSE;
    basic_query_works BOOLEAN := FALSE;
    join_query_works BOOLEAN := FALSE;
    full_query_works BOOLEAN := FALSE;
    all_tests_passed BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '📊 RESUMEN FINAL DEL TEST order_items:';
    RAISE NOTICE '';
    
    -- Verificar existencia de tabla
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') 
    INTO table_exists;
    
    -- Verificar columnas críticas
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') 
    INTO price_per_unit_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') 
    INTO total_price_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') 
    INTO quantity_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') 
    INTO order_id_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') 
    INTO product_id_exists;
    
    all_critical_exist := price_per_unit_exists AND total_price_exists AND quantity_exists AND order_id_exists AND product_id_exists;
    
    -- Probar queries
    BEGIN
        PERFORM price_per_unit FROM order_items LIMIT 1;
        basic_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        basic_query_works := FALSE;
    END;
    
    BEGIN
        PERFORM COUNT(*) FROM order_items oi LEFT JOIN orders o ON oi.order_id = o.id;
        join_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        join_query_works := FALSE;
    END;
    
    BEGIN
        PERFORM oi.price_per_unit, oi.total_price, o.status 
        FROM order_items oi 
        LEFT JOIN orders o ON oi.order_id = o.id 
        LEFT JOIN products p ON oi.product_id = p.id 
        LIMIT 1;
        full_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        full_query_works := FALSE;
    END;
    
    -- Evaluar resultados
    IF NOT table_exists THEN all_tests_passed := FALSE; END IF;
    IF NOT all_critical_exist THEN all_tests_passed := FALSE; END IF;
    IF NOT basic_query_works THEN all_tests_passed := FALSE; END IF;
    IF NOT join_query_works THEN all_tests_passed := FALSE; END IF;
    IF NOT full_query_works THEN all_tests_passed := FALSE; END IF;
    
    -- Mostrar resultado final
    IF all_tests_passed THEN
        RAISE NOTICE '🎉 ¡ERROR order_items.price_per_unit COMPLETAMENTE CORREGIDO!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Tabla order_items: EXISTE';
        RAISE NOTICE '✅ Columna price_per_unit: EXISTE';
        RAISE NOTICE '✅ Todas las columnas críticas: EXISTEN';
        RAISE NOTICE '✅ Queries básicas: FUNCIONAN';
        RAISE NOTICE '✅ Queries con JOIN: FUNCIONAN';
        RAISE NOTICE '✅ Queries del dashboard: FUNCIONAN';
        RAISE NOTICE '';
        RAISE NOTICE '🔄 El error "column order_items_1.price_per_unit does not exist" está completamente solucionado.';
        RAISE NOTICE '📱 Recarga la aplicación TRATO para confirmar que el sistema de órdenes funciona.';
    ELSE
        RAISE NOTICE '❌ ERROR order_items AÚN NO ESTÁ COMPLETAMENTE CORREGIDO';
        RAISE NOTICE '';
        RAISE NOTICE 'Estado actual:';
        RAISE NOTICE '   Tabla order_items: %', CASE WHEN table_exists THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Columna price_per_unit: %', CASE WHEN price_per_unit_exists THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Todas las columnas críticas: %', CASE WHEN all_critical_exist THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Queries básicas: %', CASE WHEN basic_query_works THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Queries con JOIN: %', CASE WHEN join_query_works THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Queries completas: %', CASE WHEN full_query_works THEN '✅' ELSE '❌' END;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Ejecuta fix_order_items_columns.sql para corregir los problemas pendientes.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICACIÓN order_items.price_per_unit COMPLETADA.';
    
END $$;