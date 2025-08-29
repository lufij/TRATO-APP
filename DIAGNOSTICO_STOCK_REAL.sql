-- =====================================================
-- 🔍 DIAGNÓSTICO COMPLETO: STOCK NO SE ACTUALIZA EN VISTA COMPRADOR
-- =====================================================

-- 🔧 PASO 1: Ver TODOS los productos con "calcoman" (sin filtros estrictos)
SELECT '=== 📦 TODOS LOS PRODUCTOS CON CALCOMANÍAS ===' as seccion;

SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    seller_id,
    created_at,
    updated_at
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY name;

-- 🔧 PASO 2: Ver productos de calcomanías con detalles completos
SELECT '=== 📋 DETALLES COMPLETOS DE CALCOMANÍAS ===' as seccion;

SELECT 
    p.id,
    p.name as producto,
    p.stock_quantity as stock_actual,
    p.is_public as es_publico,
    p.seller_id,
    s.business_name as negocio,
    p.created_at as creado,
    p.updated_at as ultima_actualizacion
FROM public.products p
LEFT JOIN public.sellers s ON p.seller_id = s.id
WHERE p.name ILIKE '%calcoman%'
ORDER BY p.stock_quantity DESC;

-- 🔧 PASO 3: Verificar query exacta que usa el comprador
SELECT '=== 🛒 QUERY EXACTA DEL COMPRADOR (con filtros) ===' as seccion;

SELECT 
    id,
    name,
    stock_quantity,
    is_public,
    seller_id,
    updated_at
FROM public.products 
WHERE is_public = true 
  AND stock_quantity > 0
  AND name ILIKE '%calcoman%'
ORDER BY created_at DESC;

-- 🔧 PASO 4: Ver últimas actualizaciones de productos
SELECT '=== ⏰ ÚLTIMAS ACTUALIZACIONES DE PRODUCTOS ===' as seccion;

SELECT 
    name,
    stock_quantity,
    updated_at,
    AGE(NOW(), updated_at) as hace_cuanto_actualizado
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY updated_at DESC;

-- 🔧 PASO 5: Verificar si hay productos duplicados o conflictos
SELECT '=== 🔄 VERIFICAR DUPLICADOS ===' as seccion;

SELECT 
    name,
    COUNT(*) as cantidad_productos,
    string_agg(DISTINCT stock_quantity::text, ', ') as stocks_diferentes,
    string_agg(DISTINCT seller_id::text, ', ') as vendedores
FROM public.products 
WHERE name ILIKE '%calcoman%'
GROUP BY name
HAVING COUNT(*) > 1;

-- 🔧 PASO 6: Ver órdenes recientes para entender el contexto
SELECT '=== 📝 ÓRDENES RECIENTES DE CALCOMANÍAS ===' as seccion;

SELECT 
    o.id,
    o.customer_name,
    o.status,
    o.total_amount,
    o.created_at,
    o.updated_at,
    COUNT(oi.id) as items_en_orden
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
WHERE o.id IN (
    SELECT DISTINCT oi2.order_id 
    FROM public.order_items oi2 
    WHERE oi2.product_name ILIKE '%calcoman%'
)
GROUP BY o.id, o.customer_name, o.status, o.total_amount, o.created_at, o.updated_at
ORDER BY o.created_at DESC
LIMIT 10;

-- 🔧 PASO 7: Ver items específicos de órdenes de calcomanías
SELECT '=== 🎯 ITEMS DE ÓRDENES DE CALCOMANÍAS ===' as seccion;

SELECT 
    oi.order_id,
    oi.product_name,
    oi.quantity,
    oi.price,
    o.status as estado_orden,
    o.created_at as fecha_orden
FROM public.order_items oi
JOIN public.orders o ON oi.order_id = o.id
WHERE oi.product_name ILIKE '%calcoman%'
ORDER BY o.created_at DESC
LIMIT 15;

-- 🔧 PASO 8: Verificar el estado de products_of_the_day
SELECT '=== 🌅 PRODUCTOS DEL DÍA (CALCOMANÍAS) ===' as seccion;

SELECT 
    potd.id,
    potd.seller_id,
    potd.product_name,
    potd.stock_quantity as stock_del_dia,
    potd.price,
    potd.date_available,
    potd.is_available,
    potd.created_at,
    potd.updated_at
FROM public.products_of_the_day potd
WHERE potd.product_name ILIKE '%calcoman%'
ORDER BY potd.date_available DESC, potd.created_at DESC;

-- 🔧 PASO 9: Comparar stocks entre products y products_of_the_day
SELECT '=== ⚖️ COMPARACIÓN STOCKS: PRODUCTS vs PRODUCTS_OF_THE_DAY ===' as seccion;

SELECT 
    'products' as tabla,
    name as producto,
    stock_quantity as stock,
    'N/A' as fecha_disponible
FROM public.products 
WHERE name ILIKE '%calcoman%'

UNION ALL

SELECT 
    'products_of_the_day' as tabla,
    product_name as producto,
    stock_quantity as stock,
    date_available::text as fecha_disponible
FROM public.products_of_the_day 
WHERE product_name ILIKE '%calcoman%'
  AND date_available = CURRENT_DATE

ORDER BY producto, tabla;

SELECT '🎯 DIAGNÓSTICO COMPLETO FINALIZADO' as resultado;
