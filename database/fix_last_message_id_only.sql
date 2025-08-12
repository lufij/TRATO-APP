-- ============================================================================
-- TRATO - Corrección Específica SOLO para Error last_message_id
-- ============================================================================
-- Este script corrige ÚNICAMENTE el error:
-- ERROR: column "last_message_id" referenced in foreign key constraint does not exist
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 CORRECCIÓN ESPECÍFICA PARA ERROR last_message_id...';
    RAISE NOTICE '';
    RAISE NOTICE 'Este script corrige SOLO:';
    RAISE NOTICE '  - ERROR: column "last_message_id" referenced in foreign key constraint does not exist';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 1: Verificar estado actual
-- ============================================================================

DO $$
DECLARE
    conversations_exists BOOLEAN := FALSE;
    messages_exists BOOLEAN := FALSE;
    last_message_id_column_exists BOOLEAN := FALSE;
    last_message_id_fk_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '📋 VERIFICANDO ESTADO ACTUAL:';
    
    -- Verificar tabla conversations
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') 
    INTO conversations_exists;
    
    -- Verificar tabla messages  
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') 
    INTO messages_exists;
    
    -- Verificar columna last_message_id
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') 
    INTO last_message_id_column_exists;
    
    -- Verificar FK constraint
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint pgc
        JOIN pg_class pgcl ON pgc.conrelid = pgcl.oid
        JOIN pg_attribute pga ON pga.attrelid = pgc.conrelid AND pga.attnum = ANY(pgc.conkey)
        WHERE pgcl.relname = 'conversations'
        AND pga.attname = 'last_message_id'
        AND pgc.contype = 'f'
    ) INTO last_message_id_fk_exists;
    
    RAISE NOTICE '   Tabla conversations: %', CASE WHEN conversations_exists THEN 'EXISTE' ELSE 'NO EXISTE' END;
    RAISE NOTICE '   Tabla messages: %', CASE WHEN messages_exists THEN 'EXISTE' ELSE 'NO EXISTE' END;
    RAISE NOTICE '   Columna last_message_id: %', CASE WHEN last_message_id_column_exists THEN 'EXISTE' ELSE 'NO EXISTE' END;
    RAISE NOTICE '   FK last_message_id: %', CASE WHEN last_message_id_fk_exists THEN 'EXISTE' ELSE 'NO EXISTE' END;
    RAISE NOTICE '';
    
    -- Solo proceder si las tablas base existen
    IF NOT conversations_exists THEN
        RAISE NOTICE '❌ ERROR: Tabla conversations no existe. Ejecuta fix_all_schema_errors_final_corrected.sql primero.';
        RETURN;
    END IF;
    
    IF NOT messages_exists THEN
        RAISE NOTICE '❌ ERROR: Tabla messages no existe. Ejecuta fix_all_schema_errors_final_corrected.sql primero.';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Tablas base existen. Procediendo con corrección específica...';
    
END $$;

-- ============================================================================
-- PASO 2: Agregar columna last_message_id si no existe
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '➕ VERIFICANDO/AGREGANDO COLUMNA last_message_id:';
    
    -- Verificar si la columna ya existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') THEN
        RAISE NOTICE '   ➕ Agregando columna last_message_id a tabla conversations...';
        
        ALTER TABLE conversations ADD COLUMN last_message_id UUID;
        
        RAISE NOTICE '   ✅ Columna last_message_id agregada exitosamente';
    ELSE
        RAISE NOTICE '   ✅ Columna last_message_id ya existe';
    END IF;
    
END $$;

-- ============================================================================
-- PASO 3: Eliminar constraint existente si existe (para evitar duplicados)
-- ============================================================================

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO CONSTRAINTS EXISTENTES:';
    
    -- Buscar constraint existente para last_message_id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'conversations' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'last_message_id'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        RAISE NOTICE '   🔍 Constraint existente encontrado: %', constraint_name;
        RAISE NOTICE '   🗑️ Eliminando constraint existente para recrearlo...';
        
        EXECUTE format('ALTER TABLE conversations DROP CONSTRAINT %I', constraint_name);
        
        RAISE NOTICE '   ✅ Constraint existente eliminado';
    ELSE
        RAISE NOTICE '   📝 No se encontraron constraints existentes para last_message_id';
    END IF;
    
END $$;

-- ============================================================================
-- PASO 4: Crear foreign key constraint correctamente
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔗 CREANDO FOREIGN KEY CONSTRAINT:';
    
    BEGIN
        -- Crear constraint con nombre específico
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_last_message_id_fkey 
        FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;
        
        RAISE NOTICE '   ✅ Foreign key constraint creado exitosamente';
        RAISE NOTICE '   📋 Constraint: conversations_last_message_id_fkey';
        RAISE NOTICE '   📋 Referencia: conversations.last_message_id → messages.id';
        RAISE NOTICE '   📋 Acción: ON DELETE SET NULL';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Error creando foreign key: %', SQLERRM;
        
        -- Intentar diagnóstico del error
        IF SQLERRM LIKE '%does not exist%' THEN
            RAISE NOTICE '   💡 Posible causa: La tabla messages o su columna id no existe';
            RAISE NOTICE '   🔧 Solución: Ejecuta fix_all_schema_errors_final_corrected.sql';
        ELSIF SQLERRM LIKE '%already exists%' THEN
            RAISE NOTICE '   💡 Posible causa: El constraint ya existe con otro nombre';
            RAISE NOTICE '   🔧 Esto es normal, el constraint ya está creado';
        ELSE
            RAISE NOTICE '   💡 Error inesperado, revisar logs de arriba';
        END IF;
    END;
    
END $$;

-- ============================================================================
-- PASO 5: Verificación final
-- ============================================================================

DO $$
DECLARE
    column_exists BOOLEAN := FALSE;
    fk_exists BOOLEAN := FALSE;
    test_query_works BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL:';
    
    -- Test 1: Verificar columna
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') 
    INTO column_exists;
    
    -- Test 2: Verificar foreign key
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint pgc
        JOIN pg_class pgcl ON pgc.conrelid = pgcl.oid
        JOIN pg_attribute pga ON pga.attrelid = pgc.conrelid AND pga.attnum = ANY(pgc.conkey)
        WHERE pgcl.relname = 'conversations'
        AND pga.attname = 'last_message_id'
        AND pgc.contype = 'f'
    ) INTO fk_exists;
    
    -- Test 3: Verificar que la query problemática ahora funciona
    BEGIN
        PERFORM COUNT(*)
        FROM conversations c
        LEFT JOIN messages m ON c.last_message_id = m.id;
        test_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        test_query_works := FALSE;
    END;
    
    -- Mostrar resultados
    RAISE NOTICE '   Columna last_message_id: %', CASE WHEN column_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Foreign Key constraint: %', CASE WHEN fk_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Query JOIN funciona: %', CASE WHEN test_query_works THEN '✅ SÍ' ELSE '❌ NO' END;
    
    RAISE NOTICE '';
    
    IF column_exists AND fk_exists AND test_query_works THEN
        RAISE NOTICE '🎉 ¡ERROR last_message_id COMPLETAMENTE CORREGIDO!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ La columna conversations.last_message_id existe';
        RAISE NOTICE '✅ El foreign key constraint está configurado';
        RAISE NOTICE '✅ Las queries JOIN funcionan correctamente';
        RAISE NOTICE '';
        RAISE NOTICE '🔄 El error "column last_message_id referenced in foreign key constraint does not exist" está solucionado.';
        RAISE NOTICE '📱 Recarga la aplicación TRATO para confirmar que el error desapareció.';
    ELSE
        RAISE NOTICE '❌ CORRECCIÓN INCOMPLETA';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Problemas detectados:';
        
        IF NOT column_exists THEN
            RAISE NOTICE '   • La columna last_message_id no se pudo crear';
        END IF;
        
        IF NOT fk_exists THEN
            RAISE NOTICE '   • El foreign key constraint no se pudo crear';
        END IF;
        
        IF NOT test_query_works THEN
            RAISE NOTICE '   • Las queries JOIN aún fallan';
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE '💡 SOLUCIONES:';
        RAISE NOTICE '   1. Ejecuta fix_all_schema_errors_final_corrected.sql (corrección completa)';
        RAISE NOTICE '   2. Verifica que las tablas users, conversations y messages existan';
        RAISE NOTICE '   3. Verifica los permisos de la base de datos';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CORRECCIÓN ESPECÍFICA COMPLETADA.';
    
END $$;