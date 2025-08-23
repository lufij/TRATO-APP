-- 🔍 VERIFICAR FUNCIONES REPARTIDORES
-- Ejecutar en SQL Editor para verificar que todo esté bien

-- Paso 1: Ver funciones existentes relacionadas con repartidores
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    prosrc as function_body
FROM pg_proc 
WHERE proname LIKE '%delivery%' OR proname LIKE '%order%' OR proname LIKE '%driver%'
ORDER BY proname;

-- Paso 2: Verificar permisos
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasinserts,
    hasselects,
    hasupdates,
    hasdeletes
FROM pg_tables 
WHERE tablename = 'orders';

-- Paso 3: Ver estructura de tabla orders
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
