-- DIAGNÓSTICO ACTUAL - SIN ÓRDENES EXISTENTES
-- ============================================

-- PASO 1: Verificar productos del día disponibles AHORA
SELECT 
    'PRODUCTOS DEL DÍA DISPONIBLES AHORA' as info,
    id,
    name,
    stock_quantity,
    is_available,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN 'VIGENTE'
        ELSE 'EXPIRADO'
    END as estado
FROM daily_products 
WHERE is_available = true 
AND stock_quantity > 0
ORDER BY expires_at DESC
LIMIT 5;

-- PASO 2: Verificar si el trigger está activo
SELECT 
    'VERIFICAR TRIGGER ACTIVO' as info,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_order_accepted'
AND event_object_table = 'orders';

-- PASO 3: Ver la función del trigger
SELECT 
    'FUNCIÓN DEL TRIGGER' as info,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'process_order_stock';

-- PASO 4: Contar productos regulares vs del día
SELECT 
    'RESUMEN PRODUCTOS' as info,
    'Productos Regulares' as tipo,
    COUNT(*) as cantidad
FROM products 
WHERE is_available = true AND stock_quantity > 0
UNION ALL
SELECT 
    'RESUMEN PRODUCTOS' as info,
    'Productos del Día' as tipo,
    COUNT(*) as cantidad
FROM daily_products 
WHERE is_available = true AND stock_quantity > 0 AND expires_at > NOW();
