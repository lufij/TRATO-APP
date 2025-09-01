-- =====================================================
-- 🔍 DIAGNÓSTICO: PRODUCTOS DEL DÍA SIN DESCUENTO
-- =====================================================
-- Ejecutar para diagnosticar por qué no se descuenta stock de productos del día

-- 📋 PASO 1: Verificar structure de daily_products
SELECT 
    '🗃️ ESTRUCTURA DAILY_PRODUCTS:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'daily_products' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 📦 PASO 2: Verificar productos del día existentes
SELECT 
    '📦 PRODUCTOS DEL DÍA ACTUALES:' as info,
    id,
    name,
    stock_quantity,
    expires_at,
    EXTRACT(HOUR FROM (expires_at - NOW())) as horas_restantes,
    CASE 
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO' 
        ELSE '✅ DISPONIBLE'
    END as estado_real
FROM public.daily_products
ORDER BY expires_at;

-- 🛒 PASO 3: Verificar órdenes recientes con productos del día
SELECT 
    '🛒 ÓRDENES RECIENTES CON PRODUCTOS DEL DÍA:' as info,
    o.id as order_id,
    o.status,
    o.created_at,
    oi.product_name,
    oi.quantity,
    oi.product_type,
    oi.product_id
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
WHERE oi.product_type = 'daily'
  AND o.created_at >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY o.created_at DESC
LIMIT 10;

-- 🔧 PASO 4: Verificar trigger actual
SELECT 
    '🔧 TRIGGERS ACTIVOS:' as info,
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND event_object_table = 'orders'
ORDER BY trigger_name;

-- 🔍 PASO 5: Buscar órdenes aceptadas que deberían haber descontado stock
WITH recent_accepted_orders AS (
    SELECT 
        o.id,
        o.status,
        o.updated_at,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.product_type
    FROM public.orders o
    JOIN public.order_items oi ON o.id = oi.order_id
    WHERE o.status = 'accepted'
      AND oi.product_type = 'daily'
      AND o.updated_at >= CURRENT_DATE - INTERVAL '2 days'
)
SELECT 
    '🧪 ANÁLISIS DE DESCUENTO:' as info,
    rao.id as order_id,
    rao.product_name,
    rao.quantity as cantidad_vendida,
    dp.stock_quantity as stock_actual,
    CASE 
        WHEN dp.id IS NULL THEN '❌ PRODUCTO NO ENCONTRADO'
        WHEN dp.stock_quantity >= 50 THEN '⚠️ STOCK ALTO - POSIBLE NO DESCUENTO'
        ELSE '✅ STOCK NORMAL'
    END as diagnostico
FROM recent_accepted_orders rao
LEFT JOIN public.daily_products dp ON rao.product_id = dp.id
ORDER BY rao.updated_at DESC;

-- 📊 PASO 6: Comparar con productos regulares
SELECT 
    '📊 COMPARACIÓN PRODUCTOS REGULARES:' as info,
    COUNT(*) as total_ordenes_regulares,
    SUM(oi.quantity) as total_vendido
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
WHERE o.status = 'accepted'
  AND COALESCE(oi.product_type, 'regular') = 'regular'
  AND o.updated_at >= CURRENT_DATE - INTERVAL '2 days';

-- 🎯 RESULTADO DEL DIAGNÓSTICO
SELECT 
    '🎯 CONCLUSIÓN:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_stock_on_order_accepted'
        ) THEN 'Trigger existe'
        ELSE 'Trigger NO existe'
    END as trigger_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.daily_products 
            WHERE stock_quantity > 0 AND expires_at > NOW()
        ) THEN 'Hay productos del día disponibles'
        ELSE 'NO hay productos del día disponibles'
    END as products_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.order_items oi ON o.id = oi.order_id
            WHERE o.status = 'accepted' 
              AND oi.product_type = 'daily'
              AND o.updated_at >= CURRENT_DATE
        ) THEN 'Hay ventas de productos del día hoy'
        ELSE 'NO hay ventas de productos del día hoy'
    END as sales_status;
