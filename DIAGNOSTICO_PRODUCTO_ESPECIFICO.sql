-- =====================================================
-- 🔍 DIAGNÓSTICO ESPECÍFICO: CALCOMANÍAS PARA CARROS
-- =====================================================

-- Buscar el producto exacto que está causando problemas
SELECT 
    '=== 🚗 DIAGNÓSTICO: CALCOMANÍAS PARA CARROS ===' as seccion;

-- 1. Buscar el producto exacto
SELECT 
    id,
    name,
    description,
    price,
    stock_quantity,
    is_public,
    is_available,
    seller_id,
    category,
    image_url,
    created_at,
    updated_at,
    -- Verificar si hay caracteres especiales
    LENGTH(name) as longitud_nombre,
    ASCII(SUBSTRING(name, 1, 1)) as primer_caracter_ascii,
    -- Mostrar caracteres invisibles
    REPLACE(REPLACE(name, ' ', '[ESPACIO]'), CHR(9), '[TAB]') as nombre_con_espacios_visibles
FROM public.products 
WHERE name ILIKE '%calcoman%carros%'
ORDER BY created_at DESC;

-- 2. Comparar con el producto que SÍ funciona (moto)
SELECT 
    '=== 🏍️ COMPARACIÓN CON CALCOMANÍAS PARA MOTO ===' as seccion;

SELECT 
    name,
    stock_quantity,
    is_public,
    is_available,
    LENGTH(name) as longitud,
    seller_id,
    category,
    price,
    CASE 
        WHEN name ILIKE '%carros%' THEN '🚗 CARROS (PROBLEMA)'
        WHEN name ILIKE '%moto%' THEN '🏍️ MOTO (FUNCIONA)'
        ELSE '❓ OTRO'
    END as tipo_producto
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY name;

-- 3. Verificar si hay duplicados con el mismo nombre
SELECT 
    '=== 🔄 VERIFICAR DUPLICADOS ===' as seccion;

SELECT 
    name,
    COUNT(*) as cantidad_duplicados,
    string_agg(id::text, ', ') as ids,
    string_agg(stock_quantity::text, ', ') as stocks,
    string_agg(is_public::text, ', ') as publicos
FROM public.products 
WHERE name ILIKE '%calcoman%carros%'
GROUP BY name;

-- 4. Verificar el vendedor y sus productos
SELECT 
    '=== 👤 VERIFICAR VENDEDOR ===' as seccion;

SELECT 
    p.name as producto,
    p.stock_quantity,
    p.is_public,
    s.business_name as negocio,
    s.id as seller_id,
    COUNT(*) OVER (PARTITION BY p.seller_id) as total_productos_vendedor
FROM public.products p
LEFT JOIN public.sellers s ON p.seller_id = s.id
WHERE p.name ILIKE '%calcoman%carros%';

-- 5. Verificar campos booleanos específicos
SELECT 
    '=== ⚙️ VERIFICAR CAMPOS ESPECÍFICOS ===' as seccion;

SELECT 
    name,
    stock_quantity,
    is_public,
    is_available,
    -- Verificar si estos campos están causando el problema
    CASE WHEN is_public IS NULL THEN 'NULL' ELSE is_public::text END as is_public_detalle,
    CASE WHEN is_available IS NULL THEN 'NULL' ELSE is_available::text END as is_available_detalle,
    CASE WHEN stock_quantity IS NULL THEN 'NULL' ELSE stock_quantity::text END as stock_detalle
FROM public.products 
WHERE name ILIKE '%calcoman%carros%';

-- 6. Query exacta que debería ver el comprador
SELECT 
    '=== 🛒 QUERY EXACTA DEL COMPRADOR ===' as seccion;

SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    is_available,
    seller_id,
    price,
    image_url,
    CASE 
        WHEN is_public = true AND stock_quantity > 0 THEN '✅ DEBERÍA APARECER'
        WHEN is_public = false THEN '❌ NO PÚBLICO'
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        ELSE '❓ OTRO PROBLEMA'
    END as estado_para_comprador
FROM public.products 
WHERE name ILIKE '%calcoman%carros%'
ORDER BY created_at DESC;

SELECT '🎯 DIAGNÓSTICO ESPECÍFICO COMPLETADO' as resultado;
