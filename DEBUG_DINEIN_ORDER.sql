-- DEBUG: VERIFICAR ORDEN DINE-IN ESPECÍFICA
-- ========================================

-- 1. Ver qué delivery_type tiene exactamente la orden dine-in
SELECT id, status, delivery_type, seller_id, buyer_id, created_at
FROM orders 
WHERE delivery_type LIKE '%dine%' OR delivery_type LIKE '%lugar%' OR delivery_type LIKE '%comer%'
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Ver TODOS los delivery_type únicos en la tabla
SELECT DISTINCT delivery_type, COUNT(*) as cantidad
FROM orders 
GROUP BY delivery_type
ORDER BY cantidad DESC;

-- 3. Buscar órdenes recientes del vendedor actual
SELECT id, status, delivery_type, total, created_at
FROM orders 
WHERE status IN ('ready', 'accepted')
ORDER BY created_at DESC 
LIMIT 10;
