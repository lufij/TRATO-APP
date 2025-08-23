-- =====================================================
-- DIAGNÓSTICO COMPLETO - PROBLEMA CARRITO PRODUCTOS DEL DÍA
-- =====================================================
-- Ejecutar en SQL Editor para diagnosticar el problema

-- 1️⃣ VERIFICAR EXISTENCIA DE TABLAS
SELECT 
    'daily_products' as tabla,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_products') 
         THEN 'EXISTE' ELSE 'NO EXISTE' END as estado
UNION ALL
SELECT 
    'cart_items' as tabla,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') 
         THEN 'EXISTE' ELSE 'NO EXISTE' END as estado
UNION ALL
SELECT 
    'products' as tabla,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') 
         THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

-- 2️⃣ VERIFICAR COLUMNAS DE CART_ITEMS
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ VERIFICAR FUNCIONES RPC
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pronamespace::regnamespace as schema
FROM pg_proc 
WHERE proname LIKE '%cart%' 
ORDER BY proname;

-- 4️⃣ VERIFICAR PRODUCTOS DEL DÍA DISPONIBLES
SELECT 
    COUNT(*) as total_productos_del_dia,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as no_expirados
FROM daily_products;

-- 5️⃣ VERIFICAR PRODUCTOS REGULARES DISPONIBLES  
SELECT 
    COUNT(*) as total_productos_regulares,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock
FROM products;

-- 6️⃣ VERIFICAR PERMISOS DE FUNCIONES
SELECT 
    p.proname as function_name,
    r.rolname as granted_to
FROM pg_proc p
JOIN pg_proc_acl pa ON p.oid = pa.objoid
JOIN pg_roles r ON pa.grantee = r.oid
WHERE p.proname = 'add_to_cart_safe';

-- 7️⃣ VERIFICAR POLÍTICAS RLS EN CART_ITEMS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'cart_items';

-- 8️⃣ PROBAR FUNCIÓN add_to_cart_safe (si existe)
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Intentar llamar la función con datos de prueba
    BEGIN
        SELECT * INTO test_result 
        FROM add_to_cart_safe(
            '00000000-0000-0000-0000-000000000000'::UUID,
            '00000000-0000-0000-0000-000000000000'::UUID,
            1,
            'regular'
        );
        
        RAISE NOTICE 'Función add_to_cart_safe responde: success=%, message=%', 
            test_result.success, test_result.message;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error probando add_to_cart_safe: %', SQLERRM;
    END;
END $$;
