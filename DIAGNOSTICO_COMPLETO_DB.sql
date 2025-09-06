-- DIAGNÓSTICO COMPLETO DE LA BASE DE DATOS
-- ========================================

-- 1. INVESTIGAR ESTRUCTURA DE LA TABLA ORDERS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. VERIFICAR CONSTRAINTS NOT NULL
SELECT 
    ccu.column_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.constraint_column_usage ccu
JOIN information_schema.table_constraints tc 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'orders'
    AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY');

-- 3. VER FOREIGN KEYS ESPECÍFICAMENTE
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='orders';

-- 4. VERIFICAR QUE TABLAS EXISTEN PARA LOS FK
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'sellers' as table_name, COUNT(*) as record_count FROM sellers  
UNION ALL
SELECT 'drivers' as table_name, COUNT(*) as record_count FROM drivers;

-- 4b. INTENTAR PROFILES SI EXISTE
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles;

-- 5. VER USUARIOS DISPONIBLES POR ROLE
SELECT 
    'users' as source_table,
    role,
    COUNT(*) as count,
    array_agg(id ORDER BY created_at DESC) as sample_ids
FROM users 
GROUP BY role;

-- 6. VER SELLERS DISPONIBLES
SELECT 
    id,
    business_name,
    is_active,
    created_at
FROM sellers 
ORDER BY created_at DESC
LIMIT 5;

-- 7. VER DRIVERS DISPONIBLES
SELECT 
    id,
    vehicle_type,
    is_active,
    is_verified,
    created_at
FROM drivers 
ORDER BY created_at DESC
LIMIT 5;

-- 8. VERIFICAR SI HAY ÓRDENES EXISTENTES Y SU ESTRUCTURA
SELECT 
    id,
    buyer_id,
    seller_id,
    driver_id,
    status,
    delivery_type,
    customer_name,
    total,
    created_at
FROM orders 
ORDER BY created_at DESC
LIMIT 3;

-- 9. VERIFICAR POLÍTICAS RLS EN ORDERS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders';

-- 10. VERIFICAR SI RLS ESTÁ ACTIVADO
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN 'RLS ACTIVADO' 
        ELSE 'RLS DESACTIVADO' 
    END as estado_rls
FROM pg_tables 
WHERE tablename = 'orders';

-- 11. VER TIPOS ENUM RELACIONADOS
SELECT 
    t.typname AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%status%' OR t.typname LIKE '%role%' OR t.typname LIKE '%delivery%'
GROUP BY t.typname;

-- 12. MOSTRAR MENSAJE FINAL
SELECT 'DIAGNÓSTICO COMPLETADO - REVISA LOS RESULTADOS ARRIBA' as mensaje;
SELECT 'Usa esta información para crear la orden correctamente' as instruccion;
