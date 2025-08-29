-- 🔍 DIAGNÓSTICO URGENTE: ¿Por qué no se actualiza el stock?
-- Verificar la orden específica y el stock actual

-- 1. Buscar la orden más reciente de "Calcomanías para carros"
SELECT 
    o.id,
    o.status,
    o.created_at,
    o.buyer_id,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.product_name ILIKE '%Calcomanias para carros%'
ORDER BY o.created_at DESC
LIMIT 5;

-- 2. Verificar stock actual del producto
SELECT 
    id,
    name,
    stock_quantity,
    is_available,
    updated_at
FROM products 
WHERE name ILIKE '%Calcomanias para carros%';

-- 3. Calcular cuánto debería ser el stock real
WITH ventas_totales AS (
    SELECT 
        oi.product_id,
        SUM(oi.quantity) as total_vendido
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.product_name ILIKE '%Calcomanias para carros%'
    AND o.status IN ('completed', 'delivered', 'accepted', 'ready', 'picked-up')
    GROUP BY oi.product_id
)
SELECT 
    p.name,
    p.stock_quantity as stock_actual,
    COALESCE(v.total_vendido, 0) as total_vendido,
    (p.stock_quantity - COALESCE(v.total_vendido, 0)) as stock_deberia_ser
FROM products p
LEFT JOIN ventas_totales v ON p.id = v.product_id
WHERE p.name ILIKE '%Calcomanias para carros%';

-- 4. Ver todas las órdenes de este producto con sus status
SELECT 
    o.id,
    o.status,
    o.created_at,
    oi.quantity,
    'Vendido: ' || oi.quantity || ' unidades' as detalle
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.product_name ILIKE '%Calcomanias para carros%'
ORDER BY o.created_at DESC;
