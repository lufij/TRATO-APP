-- ===============================================
-- CONSULTA DIRECTA PARA ENTENDER EL PROBLEMA
-- ===============================================

-- 1. VER EL PRODUCTO ESPECÍFICO
SELECT 
    'PRODUCTO_ESPECIFICO' as seccion,
    id,
    name,
    stock_quantity,
    price,
    created_at,
    expires_at,
    is_available
FROM daily_products 
WHERE id = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';

-- 2. VER TODAS LAS ÓRDENES DE ESTE PRODUCTO
SELECT 
    'ORDENES_PRODUCTO' as seccion,
    oi.id as order_item_id,
    oi.order_id,
    oi.product_id,
    oi.daily_product_id,
    oi.product_name,
    oi.product_type,
    oi.quantity,
    oi.price,
    o.status as order_status,
    o.created_at as order_date,
    o.buyer_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.daily_product_id = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47'
   OR (oi.product_type = 'daily' AND oi.product_id = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47')
ORDER BY o.created_at DESC;

-- 3. CALCULAR QUÉ STOCK DEBERÍA TENER
SELECT 
    'CALCULO_STOCK' as seccion,
    dp.name as producto,
    dp.stock_quantity as stock_actual,
    COALESCE(SUM(CASE 
        WHEN o.status IN ('delivered', 'completed', 'accepted') 
        THEN oi.quantity 
        ELSE 0 
    END), 0) as cantidad_vendida,
    dp.stock_quantity + COALESCE(SUM(CASE 
        WHEN o.status IN ('delivered', 'completed', 'accepted') 
        THEN oi.quantity 
        ELSE 0 
    END), 0) as stock_original_calculado,
    COUNT(CASE 
        WHEN o.status IN ('delivered', 'completed', 'accepted') 
        THEN 1 
    END) as ordenes_entregadas
FROM daily_products dp
LEFT JOIN order_items oi ON (
    oi.daily_product_id = dp.id 
    OR (oi.product_type = 'daily' AND oi.product_id = dp.id)
)
LEFT JOIN orders o ON oi.order_id = o.id
WHERE dp.id = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47'
GROUP BY dp.id, dp.name, dp.stock_quantity;

-- 4. VER ESTRUCTURA DE ORDER_ITEMS PARA PRODUCTOS DAILY
SELECT 
    'ESTRUCTURA_ORDER_ITEMS' as seccion,
    COUNT(*) as total_items_daily,
    COUNT(DISTINCT daily_product_id) as productos_daily_distintos,
    COUNT(CASE WHEN daily_product_id IS NOT NULL THEN 1 END) as con_daily_product_id,
    COUNT(CASE WHEN product_type = 'daily' THEN 1 END) as con_product_type_daily,
    COUNT(CASE WHEN daily_product_id IS NOT NULL AND product_type = 'daily' THEN 1 END) as con_ambos
FROM order_items 
WHERE product_type = 'daily' OR daily_product_id IS NOT NULL;

-- 5. VERIFICAR SI HAY DUPLICADOS O INCONSISTENCIAS
SELECT 
    'VERIFICACION_DUPLICADOS' as seccion,
    daily_product_id,
    product_id,
    product_type,
    COUNT(*) as cantidad
FROM order_items 
WHERE daily_product_id = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47'
   OR (product_type = 'daily' AND product_id = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47')
GROUP BY daily_product_id, product_id, product_type
HAVING COUNT(*) > 1;
