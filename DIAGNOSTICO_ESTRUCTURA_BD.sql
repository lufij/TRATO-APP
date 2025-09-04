-- 🔍 DIAGNÓSTICO DE ESTRUCTURA DE BASE DE DATOS
-- Para identificar las columnas reales de las tablas

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA PRODUCTS
SELECT 
    '📋 COLUMNAS DE LA TABLA PRODUCTS:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- 2. VERIFICAR ESTRUCTURA DE LA TABLA ORDERS
SELECT 
    '📋 COLUMNAS DE LA TABLA ORDERS:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- 3. VERIFICAR ESTRUCTURA DE LA TABLA USERS
SELECT 
    '📋 COLUMNAS DE LA TABLA USERS:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. LISTAR TODAS LAS TABLAS DISPONIBLES
SELECT 
    '📋 TABLAS DISPONIBLES EN PUBLIC:' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 5. BUSCAR COLUMNAS QUE CONTENGAN 'stock' EN CUALQUIER TABLA
SELECT 
    '🔍 COLUMNAS QUE CONTIENEN "stock":' as info,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (column_name ILIKE '%stock%' OR column_name ILIKE '%inventory%' OR column_name ILIKE '%quantity%')
ORDER BY table_name, column_name;

-- 6. VERIFICAR SI EXISTE UNA TABLA DE INVENTARIO SEPARADA
SELECT 
    '📦 TABLAS RELACIONADAS CON INVENTARIO:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (table_name ILIKE '%stock%' OR table_name ILIKE '%inventory%' OR table_name ILIKE '%product%')
ORDER BY table_name;
