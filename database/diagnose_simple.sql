-- ============================================================================
-- DIAGNÓSTICO SUPER SIMPLE PARA TRATO (SIN ERRORES)
-- ============================================================================
-- Este script verifica las tablas básicas sin usar emojis ni sintaxis compleja

-- Verificar extensión UUID
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')
        THEN 'UUID extension habilitada'
        ELSE 'UUID extension faltante'
    END as uuid_status;

-- Verificar tablas principales
SELECT 'VERIFICANDO TABLAS PRINCIPALES:' as verificacion;

SELECT 
    'users' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
        THEN 'EXISTE'
        ELSE 'FALTANTE'
    END as status;

SELECT 
    'sellers' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers')
        THEN 'EXISTE'
        ELSE 'FALTANTE'
    END as status;

SELECT 
    'products' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products')
        THEN 'EXISTE'
        ELSE 'FALTANTE'
    END as status;

-- Verificar RLS
SELECT 'VERIFICANDO ROW LEVEL SECURITY:' as verificacion;

SELECT 
    c.relname as tabla,
    CASE 
        WHEN c.relrowsecurity THEN 'RLS HABILITADO'
        ELSE 'RLS DESHABILITADO'
    END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
    AND c.relname IN ('users', 'sellers', 'products')
ORDER BY c.relname;

-- Verificar políticas
SELECT 'VERIFICANDO POLITICAS:' as verificacion;

SELECT 
    tablename,
    COUNT(*) as num_politicas
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'sellers', 'products')
GROUP BY tablename
ORDER BY tablename;

-- Verificar columna is_open en sellers
SELECT 'VERIFICANDO COLUMNAS:' as verificacion;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sellers' 
            AND column_name = 'is_open'
        )
        THEN 'sellers.is_open EXISTE'
        ELSE 'sellers.is_open FALTANTE'
    END as columna_status;

-- Verificar storage buckets (simple)
SELECT 'VERIFICANDO STORAGE:' as verificacion;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets')
        THEN 'Storage configurado'
        ELSE 'Storage no configurado'
    END as storage_status;

-- Resumen final simple
SELECT 'RESUMEN FINAL:' as verificacion;

SELECT 
    CASE 
        WHEN (
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products')
        )
        THEN 'CONFIGURACION BASICA CORRECTA - La aplicacion deberia funcionar'
        ELSE 'CONFIGURACION INCOMPLETA - Ejecuta fix_setup_basic.sql'
    END as estado_general;
