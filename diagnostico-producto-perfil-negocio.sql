-- 🔍 DIAGNÓSTICO ESPECÍFICO: Producto en Perfil de Negocio
-- Problema: "Calcomanías para moto" muestra "No disponible" en perfil negocio
-- pero muestra "10 disponibles" en inicio comprador

-- 1️⃣ VERIFICAR PRODUCTO ESPECÍFICO
SELECT 
    '1️⃣ PRODUCTO ESPECÍFICO' as seccion,
    id,
    name,
    seller_id,
    stock_quantity,
    is_public,
    is_available,
    created_at,
    updated_at
FROM products 
WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df';

-- 2️⃣ VERIFICAR TODOS LOS PRODUCTOS DEL VENDEDOR
SELECT 
    '2️⃣ TODOS PRODUCTOS VENDEDOR' as seccion,
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    -- Simulación de los filtros de getBusinessProducts
    CASE 
        WHEN is_public = true AND stock_quantity > 0 THEN 'APARECERÁ ✅'
        WHEN is_public = false THEN 'NO PÚBLICO ❌'
        WHEN stock_quantity <= 0 THEN 'SIN STOCK ❌'
        ELSE 'OCULTO ❌'
    END as resultado_filtros
FROM products 
WHERE seller_id = (
    SELECT seller_id 
    FROM products 
    WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df'
)
ORDER BY created_at DESC;

-- 3️⃣ SIMULACIÓN EXACTA DE getBusinessProducts (DESPUÉS DEL ARREGLO)
SELECT 
    '3️⃣ SIMULACIÓN getBusinessProducts' as seccion,
    p.*,
    s.business_name,
    s.is_verified
FROM products p
LEFT JOIN sellers s ON p.seller_id = s.id
WHERE p.seller_id = (
    SELECT seller_id 
    FROM products 
    WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df'
)
AND p.is_public = true
AND p.stock_quantity > 0  -- 🔥 FILTRO QUE AGREGUÉ
ORDER BY p.created_at DESC;

-- 4️⃣ COMPARAR CON fetchProducts (que SÍ funciona en inicio)
SELECT 
    '4️⃣ SIMULACIÓN fetchProducts (INICIO)' as seccion,
    id,
    name,
    stock_quantity,
    is_public,
    is_available
FROM products 
WHERE is_public = true 
AND stock_quantity > 0
AND name ILIKE '%calcoman%'
ORDER BY created_at DESC;

-- 5️⃣ VERIFICAR SI HAY PRODUCTOS DUPLICADOS
SELECT 
    '5️⃣ BÚSQUEDA DUPLICADOS' as seccion,
    COUNT(*) as cantidad,
    name,
    seller_id,
    string_agg(id::text, ', ') as ids
FROM products 
WHERE name ILIKE '%calcoman%'
GROUP BY name, seller_id
HAVING COUNT(*) > 1;

-- 6️⃣ INFORMACIÓN DEL VENDEDOR
SELECT 
    '6️⃣ INFO VENDEDOR' as seccion,
    s.id as seller_id,
    s.business_name,
    s.is_verified,
    COUNT(p.id) as total_productos,
    COUNT(CASE WHEN p.is_public = true AND p.stock_quantity > 0 THEN 1 END) as productos_visibles
FROM sellers s
LEFT JOIN products p ON s.id = p.seller_id
WHERE s.id = (
    SELECT seller_id 
    FROM products 
    WHERE id = 'a6bb1db3-fabe-4e7e-a98e-1aa11ae502df'
)
GROUP BY s.id, s.business_name, s.is_verified;
