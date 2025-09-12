-- ============================================
-- ACTIVAR TODOS LOS PRODUCTOS QUE SE DESACTIVARON
-- ============================================

-- Activar todos los productos que están inactivos
UPDATE products SET is_available = true WHERE is_available = false;

-- Verificar resultado
SELECT 
    COUNT(*) FILTER (WHERE is_available = true) as productos_activos,
    COUNT(*) FILTER (WHERE is_available = false) as productos_inactivos,
    COUNT(*) as total_productos
FROM products;

-- Mostrar algunos productos para verificar
SELECT 
    id,
    name,
    is_available,
    is_public,
    stock_quantity
FROM products 
LIMIT 10;