-- Consultas para diagnosticar el problema de órdenes (SIN FUNCIONES PERSONALIZADAS)

-- 1. Ver estadísticas generales de órdenes
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN seller_id IS NOT NULL THEN 1 END) as orders_with_seller,
    COUNT(CASE WHEN seller_id IS NULL THEN 1 END) as orphan_orders,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_orders
FROM orders;

-- 2. Ver todas las órdenes recientes
SELECT 
    id,
    seller_id,
    buyer_id,
    customer_name,
    total_amount,
    total,
    status,
    delivery_type,
    created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Ver órdenes sin seller_id (huérfanas)
SELECT 
    id,
    buyer_id,
    customer_name,
    total_amount,
    status,
    created_at
FROM orders 
WHERE seller_id IS NULL
ORDER BY created_at DESC;

-- 4. Ver todos los usuarios (auth.users)
SELECT 
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 5. Ver productos de los vendedores
SELECT 
    p.id,
    p.name,
    p.seller_id,
    p.created_at
FROM products p
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. Ver order_items para verificar la estructura
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.price_per_unit,
    oi.subtotal,
    o.seller_id as order_seller_id
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
ORDER BY oi.created_at DESC
LIMIT 10;
