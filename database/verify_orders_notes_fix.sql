-- ============================================================================
-- TRATO - Verificación Específica para Error orders.notes
-- ============================================================================
-- Este script verifica que el error específico esté corregido:
-- ERROR: column orders.notes does not exist
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO CORRECCIÓN DEL ERROR orders.notes...';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 1: Verificar estructura completa de tabla orders
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    column_info RECORD;
    column_count INTEGER := 0;
BEGIN
    RAISE NOTICE '1️⃣ VERIFICANDO ESTRUCTURA COMPLETA DE orders:';
    
    -- Verificar si la tabla existe
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') 
    INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '   ✅ Tabla orders: EXISTE';
        
        -- Contar columnas
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_name = 'orders';
        
        RAISE NOTICE '   📊 Total de columnas: %', column_count;
        
        -- Listar todas las columnas con sus tipos
        RAISE NOTICE '   📋 Estructura de columnas:';
        FOR column_info IN
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'orders'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '      • %: % (nullable: %, default: %)', 
                column_info.column_name, 
                column_info.data_type, 
                column_info.is_nullable,
                COALESCE(column_info.column_default, 'none');
        END LOOP;
        
    ELSE
        RAISE NOTICE '   ❌ Tabla orders: NO EXISTE';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 2: Verificar columna notes específicamente
-- ============================================================================

DO $$
DECLARE
    notes_exists BOOLEAN := FALSE;
    notes_type TEXT;
    notes_nullable TEXT;
BEGIN
    RAISE NOTICE '2️⃣ VERIFICANDO COLUMNA notes ESPECÍFICAMENTE:';
    
    -- Verificar si existe la columna notes
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') 
    INTO notes_exists;
    
    IF notes_exists THEN
        RAISE NOTICE '   ✅ Columna orders.notes: EXISTE';
        
        -- Obtener detalles de la columna
        SELECT data_type, is_nullable INTO notes_type, notes_nullable
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'notes';
        
        RAISE NOTICE '   📋 Tipo de datos: %', notes_type;
        RAISE NOTICE '   📋 Nullable: %', notes_nullable;
        
        IF notes_type = 'text' THEN
            RAISE NOTICE '   ✅ Tipo de datos correcto: TEXT';
        ELSE
            RAISE NOTICE '   ⚠️ Tipo de datos inesperado: %', notes_type;
        END IF;
        
    ELSE
        RAISE NOTICE '   ❌ Columna orders.notes: NO EXISTE';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 3: Probar queries que estaban fallando
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '3️⃣ PROBANDO QUERIES QUE ESTABAN FALLANDO:';
    
    -- Test 1: SELECT básico de orders
    BEGIN
        PERFORM COUNT(*) FROM orders;
        RAISE NOTICE '   ✅ SELECT COUNT(*) FROM orders: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT COUNT(*) FROM orders: ERROR - %', SQLERRM;
    END;
    
    -- Test 2: SELECT con notes específicamente
    BEGIN
        PERFORM notes FROM orders LIMIT 1;
        RAISE NOTICE '   ✅ SELECT notes FROM orders: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT notes FROM orders: ERROR - %', SQLERRM;
    END;
    
    -- Test 3: SELECT con todas las columnas importantes
    BEGIN
        PERFORM id, buyer_id, seller_id, total, status, delivery_address, delivery_type, notes, created_at FROM orders LIMIT 1;
        RAISE NOTICE '   ✅ SELECT columnas completas FROM orders: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT columnas completas FROM orders: ERROR - %', SQLERRM;
    END;
    
    -- Test 4: Query completa con JOINs (similar a SellerOrderManagement)
    BEGIN
        PERFORM 
            o.id,
            o.buyer_id,
            o.total,
            o.status,
            o.created_at,
            o.updated_at,
            o.delivery_address,
            o.delivery_type,
            o.notes,
            o.estimated_delivery
        FROM orders o
        LIMIT 1;
        RAISE NOTICE '   ✅ Query completa estilo SellerOrderManagement: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Query completa estilo SellerOrderManagement: ERROR - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 4: Verificar foreign keys relacionadas
-- ============================================================================

DO $$
DECLARE
    fk_info RECORD;
    fk_count INTEGER := 0;
BEGIN
    RAISE NOTICE '4️⃣ VERIFICANDO FOREIGN KEYS DE orders:';
    
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
        WHERE tc.table_name = 'orders' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        fk_count := fk_count + 1;
        RAISE NOTICE '   FK %: % (columna: %, delete: %)', 
            fk_count, fk_info.constraint_name, fk_info.column_name, fk_info.delete_rule;
    END LOOP;
    
    IF fk_count = 0 THEN
        RAISE NOTICE '   ⚠️ No se encontraron foreign keys en orders';
        RAISE NOTICE '   💡 Esto puede indicar que faltan relaciones con users';
    ELSE
        RAISE NOTICE '   ✅ Total de foreign keys: %', fk_count;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 5: Verificar índices de orders
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER := 0;
    index_names TEXT;
BEGIN
    RAISE NOTICE '5️⃣ VERIFICANDO ÍNDICES DE orders:';
    
    -- Contar índices
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE tablename = 'orders';
    
    IF index_count > 0 THEN
        RAISE NOTICE '   ✅ Tabla orders tiene % índices', index_count;
        
        -- Listar nombres de índices
        SELECT string_agg(indexname, ', ') INTO index_names
        FROM pg_indexes 
        WHERE tablename = 'orders';
        
        RAISE NOTICE '   📋 Índices: %', index_names;
    ELSE
        RAISE NOTICE '   ⚠️ Tabla orders no tiene índices (puede afectar rendimiento)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- RESUMEN FINAL DEL TEST
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    notes_exists BOOLEAN := FALSE;
    basic_query_works BOOLEAN := FALSE;
    notes_query_works BOOLEAN := FALSE;
    full_query_works BOOLEAN := FALSE;
    all_tests_passed BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '📊 RESUMEN FINAL DEL TEST orders.notes:';
    RAISE NOTICE '';
    
    -- Verificar existencia de tabla
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') 
    INTO table_exists;
    
    -- Verificar columna notes
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') 
    INTO notes_exists;
    
    -- Probar queries
    BEGIN
        PERFORM COUNT(*) FROM orders;
        basic_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        basic_query_works := FALSE;
    END;
    
    BEGIN
        PERFORM notes FROM orders LIMIT 1;
        notes_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        notes_query_works := FALSE;
    END;
    
    BEGIN
        PERFORM o.id, o.notes, o.status, o.created_at 
        FROM orders o 
        LIMIT 1;
        full_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        full_query_works := FALSE;
    END;
    
    -- Evaluar resultados
    IF NOT table_exists THEN all_tests_passed := FALSE; END IF;
    IF NOT notes_exists THEN all_tests_passed := FALSE; END IF;
    IF NOT basic_query_works THEN all_tests_passed := FALSE; END IF;
    IF NOT notes_query_works THEN all_tests_passed := FALSE; END IF;
    IF NOT full_query_works THEN all_tests_passed := FALSE; END IF;
    
    -- Mostrar resultado final
    IF all_tests_passed THEN
        RAISE NOTICE '🎉 ¡ERROR orders.notes COMPLETAMENTE CORREGIDO!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Tabla orders: EXISTE';
        RAISE NOTICE '✅ Columna notes: EXISTE';
        RAISE NOTICE '✅ Queries básicas: FUNCIONAN';
        RAISE NOTICE '✅ Query con notes: FUNCIONA';
        RAISE NOTICE '✅ Queries del dashboard: FUNCIONAN';
        RAISE NOTICE '';
        RAISE NOTICE '🔄 El error "column orders.notes does not exist" está completamente solucionado.';
        RAISE NOTICE '📱 Recarga la aplicación TRATO para confirmar que el sistema de pedidos funciona.';
    ELSE
        RAISE NOTICE '❌ ERROR orders.notes AÚN NO ESTÁ COMPLETAMENTE CORREGIDO';
        RAISE NOTICE '';
        RAISE NOTICE 'Estado actual:';
        RAISE NOTICE '   Tabla orders: %', CASE WHEN table_exists THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Columna notes: %', CASE WHEN notes_exists THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Queries básicas: %', CASE WHEN basic_query_works THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Query con notes: %', CASE WHEN notes_query_works THEN '✅' ELSE '❌' END;
        RAISE NOTICE '   Queries completas: %', CASE WHEN full_query_works THEN '✅' ELSE '❌' END;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Ejecuta fix_orders_notes_column.sql para corregir los problemas pendientes.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICACIÓN orders.notes COMPLETADA.';
    
END $$;