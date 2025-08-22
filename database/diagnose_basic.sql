-- ============================================================================
-- DIAGNÓSTICO BÁSICO PARA TRATO
-- ============================================================================
-- Este script verifica que las tablas esenciales estén configuradas correctamente

DO $$
BEGIN
    RAISE NOTICE '🔍 INICIANDO DIAGNÓSTICO BÁSICO...';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICAR EXTENSIONES
-- ============================================================================

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')
        THEN '✅ UUID extension habilitada'
        ELSE '❌ UUID extension faltante'
    END as uuid_status;

-- ============================================================================
-- VERIFICAR TABLAS PRINCIPALES
-- ============================================================================

WITH expected_tables AS (
    SELECT unnest(ARRAY['users', 'sellers', 'products']) as table_name
),
existing_tables AS (
    SELECT tablename as table_name
    FROM pg_tables 
    WHERE schemaname = 'public'
)
SELECT 
    et.table_name,
    CASE 
        WHEN ext.table_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ FALTANTE'
    END as status
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY et.table_name;

-- ============================================================================
-- VERIFICAR RLS (Row Level Security)
-- ============================================================================

SELECT 
    c.relname as table_name,
    CASE 
        WHEN c.relrowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS DESHABILITADO'
    END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
    AND c.relname IN ('users', 'sellers', 'products')
ORDER BY c.relname;

-- ============================================================================
-- VERIFICAR POLÍTICAS BÁSICAS
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    '✅ POLÍTICA EXISTE' as status
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'sellers', 'products')
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFICAR COLUMNAS IMPORTANTES
-- ============================================================================

-- Verificar columna is_open en sellers
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sellers' 
            AND column_name = 'is_open'
        )
        THEN '✅ sellers.is_open existe'
        ELSE '❌ sellers.is_open faltante'
    END as sellers_is_open_status;

-- ============================================================================
-- VERIFICAR STORAGE BUCKETS
-- ============================================================================

DO $$
BEGIN
    -- Verificar si existe la tabla storage.buckets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        RAISE NOTICE '📁 VERIFICANDO STORAGE BUCKETS:';
        
        -- Mostrar buckets existentes
        IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'products') THEN
            RAISE NOTICE 'Bucket products existe';
        ELSE
            RAISE NOTICE 'Bucket products faltante';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Storage no está configurado (esto es opcional)';
    END IF;
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
DECLARE
    users_exists BOOLEAN;
    sellers_exists BOOLEAN;
    products_exists BOOLEAN;
    all_good BOOLEAN;
BEGIN
    -- Verificar tablas principales
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') INTO users_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers') INTO sellers_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') INTO products_exists;
    
    all_good := users_exists AND sellers_exists AND products_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 RESUMEN DEL DIAGNÓSTICO:';
    RAISE NOTICE '';
    
    IF all_good THEN
        RAISE NOTICE '✅ CONFIGURACIÓN BÁSICA CORRECTA';
        RAISE NOTICE '✅ La aplicación debería funcionar sin bucles infinitos';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Próximos pasos:';
        RAISE NOTICE '   1. Redespliega la aplicación en Vercel';
        RAISE NOTICE '   2. Prueba la aplicación';
        RAISE NOTICE '   3. Si hay problemas con productos, ejecuta fix_product_policies.sql';
    ELSE
        RAISE NOTICE '❌ CONFIGURACIÓN INCOMPLETA';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Para corregir:';
        RAISE NOTICE '   1. Ejecuta fix_setup_basic.sql';
        RAISE NOTICE '   2. Vuelve a ejecutar este diagnóstico';
    END IF;
    
    RAISE NOTICE '';
END $$;
