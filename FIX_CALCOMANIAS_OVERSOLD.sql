-- ✅ CORRECCIÓN INMEDIATA PARA CALCOMANÍAS PARA CARROS
-- Este producto tiene overselling crítico

-- 1. Ver estado actual
SELECT 
    id,
    name,
    stock_quantity as stock_actual,
    is_available,
    updated_at
FROM products 
WHERE name ILIKE '%Calcomanias para carros%';

-- 2. Calcular stock real basado en ventas
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
    GREATEST(0, p.stock_quantity - COALESCE(v.total_vendido, 0)) as stock_corregido,
    CASE 
        WHEN (p.stock_quantity - COALESCE(v.total_vendido, 0)) <= 0 
        THEN 'AGOTADO - OVERSOLD'
        ELSE 'DISPONIBLE'
    END as estado
FROM products p
LEFT JOIN ventas_totales v ON p.id = v.product_id
WHERE p.name ILIKE '%Calcomanias para carros%';

-- 3. CORRECCIÓN INMEDIATA - Marcar como agotado
UPDATE products 
SET 
    stock_quantity = 0,
    is_available = false,
    updated_at = NOW()
WHERE name ILIKE '%Calcomanias para carros%';

-- 4. Verificar corrección
SELECT 
    'DESPUÉS DE CORRECCIÓN' as estado,
    name,
    stock_quantity,
    is_available
FROM products 
WHERE name ILIKE '%Calcomanias para carros%';
