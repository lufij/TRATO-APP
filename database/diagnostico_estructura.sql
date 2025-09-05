-- ============================================================================
-- DIAGNÓSTICO RÁPIDO: Verificar estructura actual de la base de datos
-- ============================================================================
-- Ejecuta este script ANTES del fix_setup.sql para ver qué ya existe
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
BEGIN
    RAISE NOTICE '🔍 DIAGNÓSTICO DE ESTRUCTURA DE BASE DE DATOS TRATO';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '';
    
    -- Verificar tablas existentes
    RAISE NOTICE '📊 TABLAS EXISTENTES:';
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    LOOP
        RAISE NOTICE '  ✅ %', table_record.table_name;
    END LOOP;
    RAISE NOTICE '';
    
    -- Verificar columnas de conversations específicamente
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') THEN
        RAISE NOTICE '💬 ESTRUCTURA DE TABLA conversations:';
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'conversations' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📝 % (%)', column_record.column_name, column_record.data_type;
        END LOOP;
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ Tabla conversations NO EXISTE';
        RAISE NOTICE '';
    END IF;
    
    -- Verificar columnas de notifications específicamente
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '🔔 ESTRUCTURA DE TABLA notifications:';
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📝 % (%)', column_record.column_name, column_record.data_type;
        END LOOP;
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ Tabla notifications NO EXISTE';
        RAISE NOTICE '';
    END IF;
    
    -- Verificar columnas de user_addresses específicamente
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_addresses') THEN
        RAISE NOTICE '📍 ESTRUCTURA DE TABLA user_addresses:';
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_addresses' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📝 % (%)', column_record.column_name, column_record.data_type;
        END LOOP;
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ Tabla user_addresses NO EXISTE';
        RAISE NOTICE '';
    END IF;
    
    -- Verificar columnas de orders específicamente
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '🛒 ESTRUCTURA DE TABLA orders:';
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📝 % (%)', column_record.column_name, column_record.data_type;
        END LOOP;
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ Tabla orders NO EXISTE';
        RAISE NOTICE '';
    END IF;
    
    -- Verificar columnas de order_items específicamente
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE '📋 ESTRUCTURA DE TABLA order_items:';
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'order_items' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📝 % (%)', column_record.column_name, column_record.data_type;
        END LOOP;
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ Tabla order_items NO EXISTE';
        RAISE NOTICE '';
    END IF;
    
    RAISE NOTICE '🎯 DIAGNÓSTICO COMPLETO';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Revisa la estructura mostrada arriba';
    RAISE NOTICE '2. Si falta alguna tabla, el script fix_setup.sql la creará';
    RAISE NOTICE '3. Si faltan columnas, el script las agregará automáticamente';
    RAISE NOTICE '4. Ejecuta fix_setup.sql después de revisar este diagnóstico';
    RAISE NOTICE '';
END $$;
