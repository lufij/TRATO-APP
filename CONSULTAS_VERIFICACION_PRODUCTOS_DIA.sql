-- =====================================================
-- 📊 CONSULTAS DE VERIFICACIÓN: PRODUCTOS DEL DÍA
-- =====================================================

-- 🔍 CONSULTA 1: Identificar productos del día en el sistema
SELECT 
    '📦 PRODUCTOS DEL DÍA EN EL SISTEMA:' as consulta,
    COUNT(*) as total_productos_dia,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as no_expirados,
    COUNT(CASE WHEN stock_quantity > 0 AND expires_at > NOW() THEN 1 END) as disponibles_ahora
FROM public.daily_products;

-- 🔍 CONSULTA 2: Detalles de cada producto del día
SELECT 
    '📋 DETALLE DE PRODUCTOS DEL DÍA:' as consulta,
    id,
    name,
    stock_quantity,
    expires_at,
    seller_id,
    CASE 
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO'
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        ELSE '✅ DISPONIBLE'
    END as estado,
    EXTRACT(HOUR FROM (expires_at - NOW())) as horas_restantes
FROM public.daily_products
ORDER BY created_at DESC;

-- 🛒 CONSULTA 3: Verificar dónde se almacenan las compras de productos del día
SELECT 
    '🛒 COMPRAS DE PRODUCTOS DEL DÍA:' as consulta,
    o.id as order_id,
    o.status,
    o.created_at,
    oi.product_name,
    oi.quantity,
    oi.product_type,
    oi.product_id,
    'order_items' as tabla_origen
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
WHERE oi.product_type = 'daily'
ORDER BY o.created_at DESC
LIMIT 10;

-- 🔍 CONSULTA 4: Verificar si hay compras mal marcadas (productos del día sin product_type='daily')
SELECT 
    '🔍 COMPRAS POSIBLEMENTE MAL MARCADAS:' as consulta,
    o.id as order_id,
    oi.product_name,
    oi.product_id,
    oi.product_type,
    dp.name as producto_dia_real,
    CASE 
        WHEN dp.id IS NOT NULL AND oi.product_type != 'daily' THEN '🚨 MAL MARCADO'
        WHEN dp.id IS NOT NULL AND oi.product_type = 'daily' THEN '✅ CORRECTO'
        WHEN dp.id IS NULL THEN '📦 PRODUCTO REGULAR'
        ELSE '❓ CASO RARO'
    END as diagnostico
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.daily_products dp ON oi.product_id = dp.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY o.created_at DESC
LIMIT 15;

-- 🔍 CONSULTA 5: Verificar estructura de order_items relacionada con productos del día
SELECT 
    '📊 ESTRUCTURA ORDER_ITEMS:' as consulta,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
  AND table_schema = 'public'
  AND column_name IN ('product_id', 'product_type', 'daily_product_id', 'product_name')
ORDER BY ordinal_position;

-- 🛒 CONSULTA 6: Verificar carrito actual con productos del día
SELECT 
    '🛒 CARRITO CON PRODUCTOS DEL DÍA:' as consulta,
    ci.id,
    ci.product_name,
    ci.product_type,
    ci.product_id,
    ci.quantity,
    dp.name as producto_dia_existe,
    CASE 
        WHEN ci.product_type = 'daily' AND dp.id IS NOT NULL THEN '✅ CORRECTO'
        WHEN ci.product_type = 'daily' AND dp.id IS NULL THEN '❌ ERROR'
        WHEN ci.product_type != 'daily' AND dp.id IS NOT NULL THEN '🚨 MAL MARCADO'
        ELSE '📦 PRODUCTO REGULAR'
    END as validacion
FROM public.cart_items ci
LEFT JOIN public.daily_products dp ON ci.product_id = dp.id
WHERE ci.created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY ci.created_at DESC
LIMIT 10;
