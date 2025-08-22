-- ===================================
-- VERIFICACION SISTEMA REPARTIDORES
-- ===================================

-- Verificar que las funciones RPC existen
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM (
    VALUES 
        ('get_available_deliveries'),
        ('assign_driver_to_order'),
        ('update_order_status')
) AS required_functions(function_name)
LEFT JOIN information_schema.routines r ON (
    r.routine_schema = 'public' 
    AND r.routine_name = required_functions.function_name
);

-- Verificar columnas necesarias en orders para repartidores
SELECT 
    column_name,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM (
    VALUES 
        ('driver_id'),
        ('delivery_type'),
        ('delivery_address'),
        ('estimated_time'),
        ('picked_up_at'),
        ('delivered_at')
) AS required_columns(col_name)
LEFT JOIN information_schema.columns c ON (
    c.table_schema = 'public' 
    AND c.table_name = 'orders' 
    AND c.column_name = required_columns.col_name
);

-- Verificar columnas necesarias en users para repartidores
SELECT 
    column_name,
    CASE 
        WHEN column_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM (
    VALUES 
        ('is_active'),
        ('is_verified'),
        ('vehicle_type'),
        ('license_number')
) AS required_columns(col_name)
LEFT JOIN information_schema.columns c ON (
    c.table_schema = 'public' 
    AND c.table_name = 'users' 
    AND c.column_name = required_columns.col_name
);

-- Verificar permisos para las funciones RPC
SELECT 
    p.proname as function_name,
    pg_get_function_acl(p.oid) as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_available_deliveries', 'assign_driver_to_order', 'update_order_status');

-- Verificar si hay órdenes disponibles para delivery
SELECT 
    COUNT(*) as ordenes_disponibles,
    COUNT(CASE WHEN driver_id IS NULL THEN 1 END) as sin_repartidor,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as estado_ready,
    COUNT(CASE WHEN delivery_type = 'delivery' THEN 1 END) as tipo_delivery
FROM public.orders
WHERE created_at > (NOW() - INTERVAL '7 days');

-- Mostrar resumen
SELECT 
    '=== RESUMEN VERIFICACION SISTEMA REPARTIDORES ===' as titulo,
    'Si todas las verificaciones muestran ✅, el sistema deberia funcionar' as nota;
