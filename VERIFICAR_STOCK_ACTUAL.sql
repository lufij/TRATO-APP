-- ✅ VERIFICAR STOCK ACTUAL Y ESTRUCTURA
-- Este script verifica el estado actual de los productos y su stock

-- 1. Verificar que existe la columna stock_quantity
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('stock_quantity', 'is_available');

-- 2. Ver productos actuales con su stock
SELECT 
    id,
    name,
    price,
    stock_quantity,
    is_available,
    seller_id,
    created_at
FROM products 
WHERE name ILIKE '%sopa%' 
   OR name ILIKE '%calcoman%'
ORDER BY created_at DESC;

-- 3. Ver órdenes relacionadas con estos productos
SELECT 
    o.id as order_id,
    o.status,
    o.created_at as order_date,
    oi.product_id,
    oi.product_name,
    oi.quantity as cantidad_vendida,
    oi.price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.product_name ILIKE '%sopa%' 
   OR oi.product_name ILIKE '%calcoman%'
ORDER BY o.created_at DESC;

-- 4. Calcular stock teórico vs real
WITH ventas_por_producto AS (
    SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity) as total_vendido
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status IN ('completed', 'delivered', 'accepted', 'ready', 'picked-up')
    GROUP BY oi.product_id, oi.product_name
)
SELECT 
    p.id,
    p.name,
    p.stock_quantity as stock_actual,
    COALESCE(v.total_vendido, 0) as total_vendido,
    (p.stock_quantity + COALESCE(v.total_vendido, 0)) as stock_original_calculado
FROM products p
LEFT JOIN ventas_por_producto v ON p.id = v.product_id
WHERE p.name ILIKE '%sopa%' 
   OR p.name ILIKE '%calcoman%'
ORDER BY p.name;
