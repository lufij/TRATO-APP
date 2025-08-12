-- ============================================================================
-- TRATO - Corrección Específica para user_addresses.is_default
-- ============================================================================
-- Este script corrige específicamente el error:
-- ERROR: column "is_default" does not exist
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 CORRECCIÓN ESPECÍFICA PARA user_addresses.is_default...';
    RAISE NOTICE '';
    RAISE NOTICE 'Error a corregir:';
    RAISE NOTICE '  - column "is_default" does not exist';
    RAISE NOTICE '  - Error al crear índice idx_user_addresses_is_default';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 1: Verificar estado actual de user_addresses
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    column_count INTEGER := 0;
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    existing_columns TEXT;
BEGIN
    RAISE NOTICE '📋 VERIFICANDO ESTADO ACTUAL DE user_addresses:';
    
    -- Verificar si la tabla existe
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_addresses') 
    INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '   ✅ Tabla user_addresses: EXISTE';
        
        -- Contar columnas existentes
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_name = 'user_addresses';
        
        RAISE NOTICE '   📊 Número de columnas: %', column_count;
        
        -- Listar columnas existentes
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO existing_columns
        FROM information_schema.columns 
        WHERE table_name = 'user_addresses';
        
        RAISE NOTICE '   📋 Columnas existentes: %', existing_columns;
        
        -- Verificar columnas específicas necesarias
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
            missing_columns := missing_columns || 'is_default';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_line') THEN
            missing_columns := missing_columns || 'address_line';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_type') THEN
            missing_columns := missing_columns || 'address_type';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'latitude') THEN
            missing_columns := missing_columns || 'latitude';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'longitude') THEN
            missing_columns := missing_columns || 'longitude';
        END IF;
        
        IF array_length(missing_columns, 1) > 0 THEN
            RAISE NOTICE '   ❌ Columnas faltantes: %', array_to_string(missing_columns, ', ');
        ELSE
            RAISE NOTICE '   ✅ Todas las columnas esenciales están presentes';
        END IF;
        
    ELSE
        RAISE NOTICE '   ❌ Tabla user_addresses: NO EXISTE';
        missing_columns := ARRAY['tabla_completa'];
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 2: Crear tabla user_addresses si no existe
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_addresses') THEN
        RAISE NOTICE '➕ CREANDO TABLA user_addresses COMPLETA:';
        
        -- Verificar que existe la tabla users primero
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
            RAISE NOTICE '   ❌ ERROR: Tabla users no existe';
            RAISE NOTICE '   💡 Ejecuta fix_setup.sql primero para crear la tabla users';
            RETURN;
        END IF;
        
        CREATE TABLE user_addresses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            address_line TEXT NOT NULL,
            city TEXT DEFAULT 'Gualán',
            department TEXT DEFAULT 'Zacapa',
            country TEXT DEFAULT 'Guatemala',
            postal_code TEXT,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            is_default BOOLEAN DEFAULT FALSE,
            address_type TEXT DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'other')),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla user_addresses creada con todas las columnas necesarias';
        
    ELSE
        RAISE NOTICE '✅ Tabla user_addresses ya existe, verificando columnas...';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 3: Agregar columnas faltantes a user_addresses existente
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 AGREGANDO COLUMNAS FALTANTES A user_addresses:';
    
    -- Agregar user_id si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'user_id') THEN
        RAISE NOTICE '   ➕ Agregando columna user_id...';
        
        -- Verificar que existe la tabla users
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE user_addresses ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE '   ✅ Columna user_id agregada con foreign key';
        ELSE
            ALTER TABLE user_addresses ADD COLUMN user_id UUID;
            RAISE NOTICE '   ✅ Columna user_id agregada (sin foreign key - tabla users no existe)';
        END IF;
    ELSE
        RAISE NOTICE '   ✅ Columna user_id ya existe';
    END IF;
    
    -- Agregar address_line si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_line') THEN
        RAISE NOTICE '   ➕ Agregando columna address_line...';
        ALTER TABLE user_addresses ADD COLUMN address_line TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '   ✅ Columna address_line agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna address_line ya existe';
    END IF;
    
    -- Agregar city si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'city') THEN
        RAISE NOTICE '   ➕ Agregando columna city...';
        ALTER TABLE user_addresses ADD COLUMN city TEXT DEFAULT 'Gualán';
        RAISE NOTICE '   ✅ Columna city agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna city ya existe';
    END IF;
    
    -- Agregar department si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'department') THEN
        RAISE NOTICE '   ➕ Agregando columna department...';
        ALTER TABLE user_addresses ADD COLUMN department TEXT DEFAULT 'Zacapa';
        RAISE NOTICE '   ✅ Columna department agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna department ya existe';
    END IF;
    
    -- Agregar country si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'country') THEN
        RAISE NOTICE '   ➕ Agregando columna country...';
        ALTER TABLE user_addresses ADD COLUMN country TEXT DEFAULT 'Guatemala';
        RAISE NOTICE '   ✅ Columna country agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna country ya existe';
    END IF;
    
    -- Agregar postal_code si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'postal_code') THEN
        RAISE NOTICE '   ➕ Agregando columna postal_code...';
        ALTER TABLE user_addresses ADD COLUMN postal_code TEXT;
        RAISE NOTICE '   ✅ Columna postal_code agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna postal_code ya existe';
    END IF;
    
    -- Agregar latitude si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'latitude') THEN
        RAISE NOTICE '   ➕ Agregando columna latitude...';
        ALTER TABLE user_addresses ADD COLUMN latitude DECIMAL(10, 8);
        RAISE NOTICE '   ✅ Columna latitude agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna latitude ya existe';
    END IF;
    
    -- Agregar longitude si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'longitude') THEN
        RAISE NOTICE '   ➕ Agregando columna longitude...';
        ALTER TABLE user_addresses ADD COLUMN longitude DECIMAL(11, 8);
        RAISE NOTICE '   ✅ Columna longitude agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna longitude ya existe';
    END IF;
    
    -- Agregar is_default si no existe (COLUMNA CRÍTICA QUE ESTABA FALTANDO)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
        RAISE NOTICE '   ➕ Agregando columna is_default (CRÍTICA)...';
        ALTER TABLE user_addresses ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '   ✅ Columna is_default agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna is_default ya existe';
    END IF;
    
    -- Agregar address_type si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_type') THEN
        RAISE NOTICE '   ➕ Agregando columna address_type...';
        ALTER TABLE user_addresses ADD COLUMN address_type TEXT DEFAULT 'home';
        
        -- Agregar constraint después
        BEGIN
            ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_address_type_check CHECK (address_type IN ('home', 'work', 'other'));
            RAISE NOTICE '   ✅ Constraint address_type agregado';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Constraint address_type ya existe: %', SQLERRM;
        END;
        
        RAISE NOTICE '   ✅ Columna address_type agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna address_type ya existe';
    END IF;
    
    -- Agregar notes si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'notes') THEN
        RAISE NOTICE '   ➕ Agregando columna notes...';
        ALTER TABLE user_addresses ADD COLUMN notes TEXT;
        RAISE NOTICE '   ✅ Columna notes agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna notes ya existe';
    END IF;
    
    -- Agregar created_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'created_at') THEN
        RAISE NOTICE '   ➕ Agregando columna created_at...';
        ALTER TABLE user_addresses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ✅ Columna created_at agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna created_at ya existe';
    END IF;
    
    -- Agregar updated_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'updated_at') THEN
        RAISE NOTICE '   ➕ Agregando columna updated_at...';
        ALTER TABLE user_addresses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ✅ Columna updated_at agregada';
    ELSE
        RAISE NOTICE '   ✅ Columna updated_at ya existe';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 4: Crear índices SOLO SI LAS COLUMNAS EXISTEN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📊 CREANDO ÍNDICES PARA user_addresses (SOLO SI COLUMNAS EXISTEN):';
    
    -- Índice para user_id (si existe)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'user_id') THEN
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
            RAISE NOTICE '   ✅ Índice user_id configurado';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Índice user_id ya existe o error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ⚠️ Columna user_id no existe, saltando índice';
    END IF;
    
    -- Índice para is_default (si existe) - ESTE ERA EL QUE ESTABA FALLANDO
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);
            RAISE NOTICE '   ✅ Índice is_default configurado (error corregido)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Índice is_default ya existe o error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ⚠️ Columna is_default no existe, saltando índice';
    END IF;
    
    -- Índice para address_type (si existe)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_type') THEN
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_user_addresses_address_type ON user_addresses(address_type);
            RAISE NOTICE '   ✅ Índice address_type configurado';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Índice address_type ya existe o error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ⚠️ Columna address_type no existe, saltando índice';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 5: Configurar trigger para updated_at (si columna existe)
-- ============================================================================

-- Primero, crear la función si no existe
CREATE OR REPLACE FUNCTION update_user_addresses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

DO $$
BEGIN
    RAISE NOTICE '⚡ CONFIGURANDO TRIGGER PARA updated_at (SI COLUMNA EXISTE):';
    
    -- Solo crear trigger si la columna updated_at existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'updated_at') THEN
        BEGIN
            -- Eliminar trigger existente si existe
            DROP TRIGGER IF EXISTS update_user_addresses_updated_at_trigger ON user_addresses;
            
            -- Crear nuevo trigger
            CREATE TRIGGER update_user_addresses_updated_at_trigger
                BEFORE UPDATE ON user_addresses
                FOR EACH ROW
                EXECUTE FUNCTION update_user_addresses_updated_at();
                
            RAISE NOTICE '   ✅ Trigger updated_at configurado correctamente';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Error creando trigger: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ⚠️ Columna updated_at no existe, saltando trigger';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 6: Configurar Row Level Security
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 CONFIGURANDO ROW LEVEL SECURITY PARA user_addresses:';
    
    -- Habilitar RLS
    BEGIN
        ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '   ✅ RLS habilitado en user_addresses';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Error habilitando RLS: %', SQLERRM;
    END;
    
    -- Policy para ver direcciones (solo si user_id existe)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'user_id') THEN
        BEGIN
            DROP POLICY IF EXISTS "Users can view their addresses" ON user_addresses;
            CREATE POLICY "Users can view their addresses" ON user_addresses
                FOR SELECT USING (user_id = auth.uid());
            RAISE NOTICE '   ✅ Policy SELECT configurada';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Error configurando policy SELECT: %', SQLERRM;
        END;
        
        -- Policy para insertar direcciones
        BEGIN
            DROP POLICY IF EXISTS "Users can insert their addresses" ON user_addresses;
            CREATE POLICY "Users can insert their addresses" ON user_addresses
                FOR INSERT WITH CHECK (user_id = auth.uid());
            RAISE NOTICE '   ✅ Policy INSERT configurada';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Error configurando policy INSERT: %', SQLERRM;
        END;
        
        -- Policy para actualizar direcciones
        BEGIN
            DROP POLICY IF EXISTS "Users can update their addresses" ON user_addresses;
            CREATE POLICY "Users can update their addresses" ON user_addresses
                FOR UPDATE USING (user_id = auth.uid());
            RAISE NOTICE '   ✅ Policy UPDATE configurada';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Error configurando policy UPDATE: %', SQLERRM;
        END;
        
        -- Policy para eliminar direcciones
        BEGIN
            DROP POLICY IF EXISTS "Users can delete their addresses" ON user_addresses;
            CREATE POLICY "Users can delete their addresses" ON user_addresses
                FOR DELETE USING (user_id = auth.uid());
            RAISE NOTICE '   ✅ Policy DELETE configurada';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Error configurando policy DELETE: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ⚠️ Columna user_id no existe, saltando policies';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 7: Verificación final completa
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    is_default_exists BOOLEAN := FALSE;
    user_id_exists BOOLEAN := FALSE;
    address_line_exists BOOLEAN := FALSE;
    all_critical_columns_exist BOOLEAN := FALSE;
    column_count INTEGER := 0;
    test_index_works BOOLEAN := FALSE;
    test_query_works BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL COMPLETA (user_addresses.is_default):';
    RAISE NOTICE '';
    
    -- Verificar tabla
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_addresses') 
    INTO table_exists;
    
    -- Verificar columnas críticas
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') 
    INTO is_default_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'user_id') 
    INTO user_id_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_line') 
    INTO address_line_exists;
    
    -- Contar total de columnas
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'user_addresses';
    
    -- Verificar que todas las columnas críticas existen
    all_critical_columns_exist := is_default_exists AND user_id_exists AND address_line_exists;
    
    -- Probar que el índice funciona
    BEGIN
        -- Verificar que el índice exists
        SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE tablename = 'user_addresses' 
            AND indexname = 'idx_user_addresses_is_default'
        ) INTO test_index_works;
    EXCEPTION WHEN OTHERS THEN
        test_index_works := FALSE;
    END;
    
    -- Probar query básica
    BEGIN
        PERFORM is_default FROM user_addresses LIMIT 1;
        test_query_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        test_query_works := FALSE;
    END;
    
    -- Mostrar resultados
    RAISE NOTICE '📊 RESULTADOS DE VERIFICACIÓN:';
    RAISE NOTICE '   Tabla user_addresses: %', CASE WHEN table_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Total de columnas: %', column_count;
    RAISE NOTICE '   Columna is_default: %', CASE WHEN is_default_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Columna user_id: %', CASE WHEN user_id_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Columna address_line: %', CASE WHEN address_line_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Índice is_default: %', CASE WHEN test_index_works THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Query SELECT funciona: %', CASE WHEN test_query_works THEN '✅ SÍ' ELSE '❌ NO' END;
    
    RAISE NOTICE '';
    
    IF table_exists AND all_critical_columns_exist AND test_index_works AND test_query_works THEN
        RAISE NOTICE '🎉 ¡ERROR user_addresses.is_default COMPLETAMENTE CORREGIDO!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ La tabla user_addresses existe con todas las columnas necesarias';
        RAISE NOTICE '✅ La columna is_default está disponible';
        RAISE NOTICE '✅ El índice idx_user_addresses_is_default funciona correctamente';
        RAISE NOTICE '✅ Las queries SELECT funcionan correctamente';
        RAISE NOTICE '✅ El sistema de ubicaciones debería funcionar';
        RAISE NOTICE '';
        RAISE NOTICE '🔄 El error "column is_default does not exist" está solucionado.';
        RAISE NOTICE '📱 Ahora puedes ejecutar fix_setup.sql sin errores.';
    ELSE
        RAISE NOTICE '❌ CORRECCIÓN INCOMPLETA DE user_addresses.is_default';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Problemas detectados:';
        
        IF NOT table_exists THEN
            RAISE NOTICE '   • La tabla user_addresses no se pudo crear';
        END IF;
        
        IF NOT is_default_exists THEN
            RAISE NOTICE '   • La columna is_default no se pudo agregar';
        END IF;
        
        IF NOT test_index_works THEN
            RAISE NOTICE '   • El índice idx_user_addresses_is_default no funciona';
        END IF;
        
        IF NOT test_query_works THEN
            RAISE NOTICE '   • Las queries SELECT con is_default aún fallan';
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE '💡 SOLUCIONES:';
        RAISE NOTICE '   1. Verifica que la tabla users existe primero';
        RAISE NOTICE '   2. Ejecuta fix_setup.sql completo después de esta corrección';
        RAISE NOTICE '   3. Verifica los permisos de la base de datos';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CORRECCIÓN ESPECÍFICA user_addresses.is_default COMPLETADA.';
    
END $$;