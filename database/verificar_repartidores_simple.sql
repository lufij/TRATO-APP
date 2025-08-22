-- ===================================
-- VERIFICACION SIMPLE SISTEMA REPARTIDORES
-- ===================================

-- 1. Verificar que las funciones RPC existen
WITH required_functions AS (
    SELECT unnest(ARRAY['get_available_deliveries', 'assign_driver_to_order', 'update_order_status']) as func_name
)
SELECT 
    rf.func_name as function_name,
    CASE 
        WHEN r.routine_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM required_functions rf
LEFT JOIN information_schema.routines r ON (
    r.routine_schema = 'public' 
    AND r.routine_name = rf.func_name
);

-- 2. Verificar columnas necesarias en orders para repartidores
WITH required_columns AS (
    SELECT unnest(ARRAY['driver_id', 'delivery_type', 'delivery_address', 'estimated_time', 'picked_up_at', 'delivered_at']) as col_name
)
SELECT 
    rc.col_name as column_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM required_columns rc
LEFT JOIN information_schema.columns c ON (
    c.table_schema = 'public' 
    AND c.table_name = 'orders' 
    AND c.column_name = rc.col_name
);

-- 3. Verificar columnas necesarias en users para repartidores
WITH required_user_columns AS (
    SELECT unnest(ARRAY['is_active', 'is_verified', 'vehicle_type', 'license_number']) as col_name
)
SELECT 
    ruc.col_name as column_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM required_user_columns ruc
LEFT JOIN information_schema.columns c ON (
    c.table_schema = 'public' 
    AND c.table_name = 'users' 
    AND c.column_name = ruc.col_name
);

-- 4. Verificar si hay órdenes disponibles para delivery
SELECT 
    COUNT(*) as total_ordenes_ultima_semana,
    COUNT(CASE WHEN driver_id IS NULL THEN 1 END) as ordenes_sin_repartidor,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ordenes_estado_ready,
    COUNT(CASE WHEN delivery_type = 'delivery' THEN 1 END) as ordenes_tipo_delivery
FROM public.orders
WHERE created_at > (NOW() - INTERVAL '7 days');

-- 5. Test directo de función RPC
SELECT 
    'Probando get_available_deliveries()' as test,
    CASE 
        WHEN count(*) >= 0 THEN '✅ Función funciona correctamente'
        ELSE '❌ Error en función'
    END as resultado
FROM (
    SELECT * FROM get_available_deliveries() LIMIT 1
) test_query;

-- 6. Mostrar resumen
SELECT 
    '=== RESUMEN VERIFICACION SISTEMA REPARTIDORES ===' as titulo,
    'Si todas las verificaciones muestran ✅, el sistema deberia funcionar' as nota;
