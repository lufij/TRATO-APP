-- =====================================================
-- 🔧 DIAGNÓSTICO Y SOLUCIÓN: PRODUCTOS DEL DÍA
-- =====================================================
-- Este script va a diagnosticar y solucionar el problema específico

-- PASO 1: Verificar si el trigger existe y está activo
SELECT 
    '1. VERIFICAR TRIGGER' as paso,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_order_accepted'
AND event_object_table = 'orders';

-- PASO 2: Ver productos del día disponibles
SELECT 
    '2. PRODUCTOS DEL DÍA DISPONIBLES' as paso,
    id,
    name,
    stock_quantity,
    is_available,
    expires_at
FROM daily_products 
WHERE is_available = true 
AND stock_quantity > 0 
AND expires_at > NOW()
ORDER BY name
LIMIT 5;

-- PASO 3: Ver órdenes pendientes con productos del día
SELECT 
    '3. ÓRDENES PENDIENTES CON PRODUCTOS DEL DÍA' as paso,
    o.id as order_id,
    o.status,
    o.customer_name,
    o.total_amount,
    oi.product_name,
    oi.product_type,
    oi.quantity,
    oi.product_id,
    -- Verificar si el producto existe
    CASE 
        WHEN oi.product_type = 'daily' THEN 
            (SELECT stock_quantity FROM daily_products WHERE id = oi.product_id)
        ELSE 
            (SELECT stock_quantity FROM products WHERE id = oi.product_id)
    END as stock_actual
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'pending'
AND o.created_at >= CURRENT_DATE
AND (oi.product_type = 'daily' OR oi.daily_product_id IS NOT NULL)
ORDER BY o.created_at DESC
LIMIT 10;

-- PASO 4: Verificar inconsistencias en order_items
SELECT 
    '4. PROBLEMAS EN ORDER_ITEMS' as paso,
    oi.product_name,
    oi.product_type,
    oi.product_id,
    oi.daily_product_id,
    -- Verificar si product_id apunta a daily_products cuando es tipo 'daily'
    CASE 
        WHEN oi.product_type = 'daily' AND oi.product_id IS NOT NULL THEN
            CASE 
                WHEN EXISTS(SELECT 1 FROM daily_products WHERE id = oi.product_id) THEN 'CORRECTO'
                ELSE 'ERROR: product_id no existe en daily_products'
            END
        WHEN oi.product_type != 'daily' AND oi.product_id IS NOT NULL THEN
            CASE 
                WHEN EXISTS(SELECT 1 FROM products WHERE id = oi.product_id) THEN 'CORRECTO'
                ELSE 'ERROR: product_id no existe en products'
            END
        ELSE 'REVISAR'
    END as diagnostico
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= CURRENT_DATE
AND o.status = 'pending'
LIMIT 10;

-- PASO 5: Solución inmediata - Corregir product_type en order_items problemáticos
WITH items_a_corregir AS (
    SELECT oi.id, oi.product_name, oi.product_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'pending'
    AND o.created_at >= CURRENT_DATE
    AND (
        -- Caso 1: Tiene daily_product_id pero product_type no es 'daily'
        (oi.daily_product_id IS NOT NULL AND oi.product_type != 'daily')
        OR
        -- Caso 2: product_id apunta a daily_products pero product_type no es 'daily'
        (oi.product_type != 'daily' AND EXISTS(SELECT 1 FROM daily_products WHERE id = oi.product_id))
        OR
        -- Caso 3: product_type es null pero debería ser 'daily'
        (oi.product_type IS NULL AND EXISTS(SELECT 1 FROM daily_products WHERE id = oi.product_id))
    )
)
UPDATE order_items 
SET 
    product_type = 'daily',
    updated_at = NOW()
WHERE id IN (SELECT id FROM items_a_corregir);

-- PASO 6: Mostrar resultado de la corrección
SELECT 
    '6. RESULTADO DE LA CORRECCIÓN' as paso,
    COUNT(*) as items_corregidos
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'pending'
AND o.created_at >= CURRENT_DATE
AND oi.product_type = 'daily'
AND oi.updated_at >= NOW() - INTERVAL '5 minutes';

-- PASO 7: Verificar que el trigger está respondiendo
-- (Para probar manualmente después de ejecutar este script)
-- SELECT 'Ahora intenta aceptar una orden de productos del día' as instrucciones;
