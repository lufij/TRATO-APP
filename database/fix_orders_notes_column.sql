-- ============================================================================
-- TRATO - Corrección Específica para Columna orders.notes
-- ============================================================================
-- Este script corrige específicamente el error:
-- ERROR: column orders.notes does not exist
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 CORRECCIÓN ESPECÍFICA PARA orders.notes...';
    RAISE NOTICE '';
    RAISE NOTICE 'Error a corregir:';
    RAISE NOTICE '  - column orders.notes does not exist';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICAR Y AGREGAR COLUMNA notes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO Y AGREGANDO COLUMNA notes A orders:';
    
    -- Verificar si la tabla orders existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '   ❌ ERROR: Tabla orders no existe';
        RAISE NOTICE '   💡 Ejecuta fix_setup.sql primero';
        RETURN;
    END IF;
    
    RAISE NOTICE '   ✅ Tabla orders existe';
    
    -- Verificar si la columna notes ya existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
        RAISE NOTICE '   ✅ Columna notes ya existe';
    ELSE
        RAISE NOTICE '   ➕ Agregando columna notes a orders...';
        
        BEGIN
            ALTER TABLE orders ADD COLUMN notes TEXT;
            RAISE NOTICE '   ✅ Columna notes agregada exitosamente';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Error agregando notes: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICAR OTRAS COLUMNAS CRÍTICAS DE orders
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO OTRAS COLUMNAS CRÍTICAS DE orders:';
    
    -- Lista de columnas críticas que deben existir
    DECLARE
        critical_columns TEXT[] := ARRAY[
            'id', 'buyer_id', 'seller_id', 'total', 'status', 
            'delivery_address', 'delivery_type', 'notes', 
            'estimated_delivery', 'delivered_at', 'created_at', 'updated_at'
        ];
        col TEXT;
        exists_check BOOLEAN;
        missing_count INTEGER := 0;
    BEGIN
        FOREACH col IN ARRAY critical_columns
        LOOP
            SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = col) 
            INTO exists_check;
            
            IF exists_check THEN
                RAISE NOTICE '   ✅ Columna %: EXISTE', col;
            ELSE
                RAISE NOTICE '   ❌ Columna %: NO EXISTE', col;
                missing_count := missing_count + 1;
            END IF;
        END LOOP;
        
        RAISE NOTICE '';
        
        IF missing_count = 0 THEN
            RAISE NOTICE '   🎉 Todas las columnas críticas de orders están presentes';
        ELSE
            RAISE NOTICE '   ⚠️ Faltan % columnas críticas en orders', missing_count;
            RAISE NOTICE '   🔧 Ejecuta fix_setup.sql para corregir todas las columnas';
        END IF;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST SIMPLE DE VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    notes_exists BOOLEAN := FALSE;
    test_works BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🧪 TEST SIMPLE DE VERIFICACIÓN:';
    
    -- Verificar columna notes
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') 
    INTO notes_exists;
    
    -- Probar query que estaba fallando
    BEGIN
        PERFORM id, notes FROM orders LIMIT 1;
        test_works := TRUE;
        RAISE NOTICE '   ✅ Query SELECT con orders.notes: FUNCIONA';
    EXCEPTION WHEN OTHERS THEN
        test_works := FALSE;
        RAISE NOTICE '   ❌ Query SELECT con orders.notes: ERROR - %', SQLERRM;
    END;
    
    -- Mostrar resultados
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESULTADOS:';
    RAISE NOTICE '   orders.notes existe: %', CASE WHEN notes_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE '   Query SELECT funciona: %', CASE WHEN test_works THEN '✅ SÍ' ELSE '❌ NO' END;
    
    IF notes_exists AND test_works THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ¡CORRECCIÓN ESPECÍFICA EXITOSA!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ El error "column orders.notes does not exist" está solucionado';
        RAISE NOTICE '📱 Recarga la aplicación TRATO para confirmar';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ CORRECCIÓN INCOMPLETA';
        
        IF NOT notes_exists THEN
            RAISE NOTICE '   • La columna notes no se pudo agregar';
        END IF;
        
        IF NOT test_works THEN
            RAISE NOTICE '   • La query SELECT con notes aún falla';
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Ejecuta fix_setup.sql para una corrección completa';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CORRECCIÓN ESPECÍFICA orders.notes COMPLETADA.';
    
END $$;