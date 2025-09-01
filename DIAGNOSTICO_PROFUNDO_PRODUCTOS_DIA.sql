-- =====================================================
-- 🔍 DIAGNÓSTICO PROFUNDO: FLUJO DE PRODUCTOS DEL DÍA
-- =====================================================
-- Ejecutar para encontrar EXACTAMENTE dónde se rompe el flujo

-- 📋 PASO 1: Verificar productos del día específicos
SELECT 
    '📦 PRODUCTOS DEL DÍA DETALLADOS:' as info,
    id,
    name,
    stock_quantity,
    seller_id,
    expires_at,
    created_at,
    CASE 
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO'
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        ELSE '✅ DISPONIBLE'
    END as estado
FROM public.daily_products
ORDER BY created_at DESC;

-- 🛒 PASO 2: Verificar TODAS las órdenes recientes (no solo con product_type='daily')
SELECT 
    '🛒 TODAS LAS ÓRDENES RECIENTES:' as info,
    o.id as order_id,
    o.status,
    o.created_at,
    oi.product_name,
    oi.quantity,
    oi.product_type,
    oi.product_id,
    CASE 
        WHEN oi.product_type = 'daily' THEN '🔥 PRODUCTO DEL DÍA'
        WHEN oi.product_type = 'regular' THEN '📦 PRODUCTO REGULAR'
        WHEN oi.product_type IS NULL THEN '⚠️ SIN TIPO DEFINIDO'
        ELSE '❓ TIPO DESCONOCIDO'
    END as tipo_detalle
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY o.created_at DESC
LIMIT 15;

-- 🔍 PASO 3: Buscar órdenes que DEBERÍAN ser productos del día pero no están marcadas
SELECT 
    '🔍 POSIBLES PRODUCTOS DEL DÍA MAL MARCADOS:' as info,
    o.id as order_id,
    oi.product_name,
    oi.product_id,
    oi.product_type,
    dp.id as daily_product_exists,
    p.id as regular_product_exists,
    CASE 
        WHEN dp.id IS NOT NULL AND oi.product_type != 'daily' THEN '🚨 ES PRODUCTO DEL DÍA PERO MAL MARCADO'
        WHEN dp.id IS NOT NULL AND oi.product_type = 'daily' THEN '✅ CORRECTO'
        WHEN p.id IS NOT NULL AND oi.product_type IN ('regular', NULL) THEN '✅ PRODUCTO REGULAR CORRECTO'
        ELSE '❓ CASO RARO'
    END as diagnostico
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.daily_products dp ON oi.product_id = dp.id
LEFT JOIN public.products p ON oi.product_id = p.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY o.created_at DESC;

-- 🛒 PASO 4: Verificar carrito actual (si hay items)
SELECT 
    '🛒 ITEMS EN CARRITO ACTUAL:' as info,
    ci.id,
    ci.product_name,
    ci.product_type,
    ci.product_id,
    ci.quantity,
    dp.id as daily_exists,
    p.id as regular_exists,
    CASE 
        WHEN ci.product_type = 'daily' AND dp.id IS NOT NULL THEN '✅ CORRECTO - PRODUCTO DEL DÍA'
        WHEN ci.product_type = 'daily' AND dp.id IS NULL THEN '❌ ERROR - MARCADO COMO DEL DÍA PERO NO EXISTE'
        WHEN ci.product_type = 'regular' AND p.id IS NOT NULL THEN '✅ CORRECTO - PRODUCTO REGULAR'
        WHEN ci.product_type IS NULL THEN '⚠️ SIN TIPO DEFINIDO'
        ELSE '❓ CASO RARO'
    END as validacion
FROM public.cart_items ci
LEFT JOIN public.daily_products dp ON ci.product_id = dp.id
LEFT JOIN public.products p ON ci.product_id = p.id
WHERE ci.created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY ci.created_at DESC
LIMIT 10;

-- 📊 PASO 5: Verificar estructura de order_items para detectar el problema
SELECT 
    '📊 ESTRUCTURA ORDER_ITEMS:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
AND column_name IN ('product_id', 'product_type', 'daily_product_id', 'product_name')
ORDER BY ordinal_position;

-- 🎯 PASO 6: Buscar el ID específico del producto del día para testing
SELECT 
    '🎯 PRODUCTO DEL DÍA PARA TESTING:' as info,
    id,
    name,
    stock_quantity,
    'USAR ESTE ID PARA HACER UNA COMPRA DE PRUEBA' as instruccion
FROM public.daily_products 
WHERE stock_quantity > 0 
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1;

-- 🔬 PASO 7: Verificar función add_to_cart_safe
SELECT 
    '🔬 FUNCIÓN ADD_TO_CART:' as info,
    routine_name,
    routine_type,
    'EXISTE' as estado
FROM information_schema.routines 
WHERE routine_name = 'add_to_cart_safe'
  AND routine_schema = 'public';

-- 💡 DIAGNÓSTICO FINAL
SELECT 
    '💡 PRÓXIMOS PASOS:' as info,
    '1. Hacer una compra de prueba del producto del día' as paso_1,
    '2. Verificar que se marque como product_type=daily en order_items' as paso_2,
    '3. Aceptar la orden como vendedor' as paso_3,
    '4. Verificar descuento de stock en daily_products' as paso_4;
