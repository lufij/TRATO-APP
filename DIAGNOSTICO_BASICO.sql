-- Consultas básicas para diagnosticar el esquema

-- 1. Ver qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Ver estructura de la tabla orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 3. Ver todas las órdenes (SIN JOINS)
SELECT 
    id,
    seller_id,
    buyer_id,
    customer_name,
    total_amount,
    total,
    status,
    created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Contar órdenes por seller_id
SELECT 
    seller_id,
    COUNT(*) as order_count
FROM orders 
GROUP BY seller_id
ORDER BY order_count DESC;
