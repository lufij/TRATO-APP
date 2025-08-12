-- Script para verificar el esquema de la tabla users
-- Ejecuta este script para ver exactamente qué columnas existen

DO $$
DECLARE
    column_record RECORD;
    table_exists BOOLEAN := false;
    column_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN DEL ESQUEMA DE LA TABLA USERS';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';

    -- Verificar si la tabla users existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE NOTICE '❌ La tabla "users" no existe';
        RAISE NOTICE '💡 Ejecuta /database/fix_setup.sql para crear las tablas';
        RETURN;
    END IF;

    RAISE NOTICE '✅ La tabla "users" existe';
    RAISE NOTICE '';
    RAISE NOTICE '📋 COLUMNAS EN LA TABLA USERS:';
    RAISE NOTICE '==============================';

    -- Listar todas las columnas de la tabla users
    FOR column_record IN
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        ORDER BY ordinal_position
    LOOP
        column_count := column_count + 1;
        RAISE NOTICE '% • % (%) - Nullable: % - Default: %', 
            column_count,
            column_record.column_name, 
            column_record.data_type,
            column_record.is_nullable,
            COALESCE(column_record.column_default, 'NULL');
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN:';
    RAISE NOTICE '===========';
    RAISE NOTICE '• Total de columnas: %', column_count;
    
    -- Verificar columnas específicas que necesita el marketplace
    RAISE NOTICE '';
    RAISE NOTICE '🔎 VERIFICACIÓN DE COLUMNAS ESPECÍFICAS:';
    RAISE NOTICE '======================================';
    
    -- Verificar business_type vs business_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_type') THEN
        RAISE NOTICE '✅ Columna "business_type" existe';
    ELSE
        RAISE NOTICE '❌ Columna "business_type" NO existe';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_name') THEN
            RAISE NOTICE '✅ Alternativa "business_name" existe';
        ELSE
            RAISE NOTICE '❌ Alternativa "business_name" tampoco existe';
        END IF;
    END IF;
    
    -- Verificar otras columnas importantes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_description') THEN
        RAISE NOTICE '✅ Columna "business_description" existe';
    ELSE
        RAISE NOTICE '❌ Columna "business_description" NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_rating') THEN
        RAISE NOTICE '✅ Columna "business_rating" existe';
    ELSE
        RAISE NOTICE '❌ Columna "business_rating" NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_reviews') THEN
        RAISE NOTICE '✅ Columna "total_reviews" existe';
    ELSE
        RAISE NOTICE '❌ Columna "total_reviews" NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_open') THEN
        RAISE NOTICE '✅ Columna "is_open" existe';
    ELSE
        RAISE NOTICE '❌ Columna "is_open" NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_image_url') THEN
        RAISE NOTICE '✅ Columna "profile_image_url" existe';
    ELSE
        RAISE NOTICE '❌ Columna "profile_image_url" NO existe';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '💡 RECOMENDACIONES:';
    RAISE NOTICE '==================';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_type') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_name') THEN
            RAISE NOTICE '• Usa "business_name" en lugar de "business_type" en las consultas';
        ELSE
            RAISE NOTICE '• Ejecuta /database/fix_setup.sql para agregar las columnas faltantes';
        END IF;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR al verificar el esquema: %', SQLERRM;
    RAISE NOTICE '💡 Esto puede indicar problemas de permisos o conexión a la base de datos';
END $$;