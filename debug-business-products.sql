-- 🔍 INVESTIGACIÓN: Productos en perfil del negocio
-- Comparar productos que se muestran vs que NO se muestran

-- 1. Ver TODOS los productos de este vendedor (incluidos sin stock)
SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    seller_id,
    created_at,
    -- Campos que podrían afectar visibilidad
    category,
    description,
    price
FROM products 
WHERE seller_id IN (
    SELECT DISTINCT seller_id 
    FROM products 
    WHERE name ILIKE '%calcomanias%'
)
ORDER BY name, created_at DESC;

-- 2. Verificar específicamente "Calcomanías para moto"
SELECT 
    'CALCOMANIAS PARA MOTO' as producto,
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    seller_id,
    -- Verificar si cumple condiciones para mostrarse
    (is_public = true) as cumple_is_public,
    (stock_quantity > 0) as cumple_stock,
    (is_available = true) as cumple_is_available,
    -- Resultado final esperado
    (is_public = true AND stock_quantity > 0 AND is_available = true) as deberia_mostrarse
FROM products 
WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df';

-- 3. Comparar con "Calcomanías para carros" que SÍ funciona
SELECT 
    'TODOS LOS PRODUCTOS CON CALCOMANIAS' as categoria,
    name,
    stock_quantity,
    is_public,
    is_available,
    -- Validación completa
    (is_public = true AND stock_quantity > 0 AND is_available = true) as deberia_mostrarse
FROM products 
WHERE name ILIKE '%calcomanias%'
ORDER BY name;

-- 4. Verificar si hay registros en daily_products que interfieran
SELECT 
    'DAILY_PRODUCTS CHECK' as tabla,
    dp.id,
    dp.name,
    dp.stock_quantity as daily_stock,
    dp.expires_at,
    dp.product_id,
    p.name as product_name,
    p.stock_quantity as product_stock
FROM daily_products dp
LEFT JOIN products p ON dp.product_id = p.id
WHERE dp.name ILIKE '%calcomanias%' OR p.name ILIKE '%calcomanias%';
