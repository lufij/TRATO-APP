-- ===============================================
-- DIAGNÓSTICO COMPLETO DE ESTRUCTURA DE DATOS
-- Para entender exactamente dónde están los productos del día y sus órdenes
-- ===============================================

-- 1. ESTRUCTURA DE DAILY_PRODUCTS
SELECT 
    'ESTRUCTURA DAILY_PRODUCTS' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'daily_products'
ORDER BY ordinal_position;

-- 2. ESTRUCTURA DE ORDER_ITEMS  
SELECT 
    'ESTRUCTURA ORDER_ITEMS' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 3. PRODUCTOS DEL DÍA ACTUALES
SELECT 
    'PRODUCTOS_DEL_DIA' as tipo,
    id,
    name,
    stock_quantity,
    price,
    created_at
FROM daily_products
ORDER BY created_at DESC
LIMIT 10;

-- 4. ÓRDENES DE PRODUCTOS DEL DÍA (últimas 20)
SELECT 
    'ORDENES_PRODUCTOS_DIA' as tipo,
    oi.id as order_item_id,
    oi.order_id,
    oi.product_id,
    oi.daily_product_id,
    oi.product_type,
    oi.quantity,
    oi.price,
    dp.name as daily_product_name,
    dp.stock_quantity as stock_actual,
    o.status as order_status,
    o.created_at
FROM order_items oi
LEFT JOIN daily_products dp ON oi.daily_product_id = dp.id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE oi.product_type = 'daily' OR oi.daily_product_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 20;

-- 5. RELACIÓN ESPECÍFICA DEL PRODUCTO QUE MOSTRASTE
SELECT 
    'PRODUCTO_ESPECIFICO' as tipo,
    dp.id as daily_product_id,
    dp.name,
    dp.stock_quantity,
    dp.price,
    COUNT(oi.id) as total_ordenes,
    SUM(oi.quantity) as cantidad_total_vendida,
    dp.stock_quantity + COALESCE(SUM(oi.quantity), 0) as stock_original_calculado
FROM daily_products dp
LEFT JOIN order_items oi ON (
    oi.daily_product_id = dp.id 
    OR (oi.product_type = 'daily' AND oi.product_id::text = dp.id::text)
)
WHERE dp.id = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47'  -- ID del producto que mostraste
GROUP BY dp.id, dp.name, dp.stock_quantity, dp.price;

-- 6. VERIFICAR SI HAY ÓRDENES CON DIFERENTES FORMAS DE REFERENCIAR
SELECT 
    'FORMAS_REFERENCIA' as tipo,
    CASE 
        WHEN daily_product_id IS NOT NULL THEN 'daily_product_id'
        WHEN product_type = 'daily' THEN 'product_type_daily'
        ELSE 'otra_forma'
    END as metodo_referencia,
    COUNT(*) as cantidad
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE (oi.daily_product_id IS NOT NULL OR oi.product_type = 'daily')
AND o.status IN ('delivered', 'completed', 'accepted')
GROUP BY 
    CASE 
        WHEN daily_product_id IS NOT NULL THEN 'daily_product_id'
        WHEN product_type = 'daily' THEN 'product_type_daily'
        ELSE 'otra_forma'
    END;

-- 7. ÓRDENES ENTREGADAS QUE NO HAN DECREMENTADO STOCK
SELECT 
    'ORDENES_ENTREGADAS_SIN_DECREMENTAR' as tipo,
    oi.id,
    oi.order_id,
    oi.daily_product_id,
    oi.product_id,
    oi.quantity,
    dp.name,
    dp.stock_quantity as stock_actual,
    o.status,
    o.created_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN daily_products dp ON oi.daily_product_id = dp.id
WHERE (oi.daily_product_id IS NOT NULL OR oi.product_type = 'daily')
AND o.status IN ('delivered', 'completed', 'accepted')
ORDER BY o.created_at DESC
LIMIT 15;

-- 8. RESUMEN EJECUTIVO
SELECT 
    'RESUMEN' as tipo,
    'Total productos del día' as concepto,
    COUNT(*) as valor
FROM daily_products
UNION ALL
SELECT 
    'RESUMEN',
    'Total order_items de productos del día',
    COUNT(*)
FROM order_items 
WHERE daily_product_id IS NOT NULL OR product_type = 'daily'
UNION ALL
SELECT 
    'RESUMEN',
    'Órdenes entregadas de productos del día',
    COUNT(*)
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE (oi.daily_product_id IS NOT NULL OR oi.product_type = 'daily')
AND o.status IN ('delivered', 'completed', 'accepted');
