-- =====================================================
-- 🔍 MONITOREO EN TIEMPO REAL - PRODUCTOS DEL DÍA
-- =====================================================

-- Ejecutar esta consulta mientras haces las pruebas para ver los cambios

-- Stock actual de Sopa 4 quesos
SELECT 
    '📦 STOCK ACTUAL:' as titulo,
    name,
    stock_quantity,
    expires_at,
    CASE 
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO'
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        ELSE '✅ DISPONIBLE'
    END as estado
FROM daily_products
WHERE name = 'Sopa 4 quesos';

-- Órdenes más recientes con productos del día
SELECT 
    '📋 ÓRDENES RECIENTES:' as titulo,
    o.id as order_id,
    o.status,
    oi.product_name,
    oi.product_type,
    oi.quantity,
    o.created_at
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.product_type = 'daily'
  AND o.created_at >= NOW() - INTERVAL '30 minutes'
ORDER BY o.created_at DESC;

-- Items en carrito actual (si hay)
SELECT 
    '🛒 CARRITO ACTUAL:' as titulo,
    product_name,
    product_type,
    quantity,
    created_at
FROM cart_items
WHERE created_at >= NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;
