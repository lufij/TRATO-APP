-- =====================================================
-- 🔍 DIAGNÓSTICO: VISTA COMPRADOR NO SE ACTUALIZA
-- =====================================================
-- Verificar por qué el stock no se muestra actualizado en la vista del comprador

-- 🔧 PASO 1: Verificar stock actual en base de datos
SELECT '🔍 STOCK ACTUAL EN BASE DE DATOS:' as diagnostico;

SELECT 
    id,
    name as "Producto",
    stock_quantity as "Stock Real BD",
    is_public as "¿Público?",
    updated_at as "Última Actualización",
    created_at as "Creado"
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY name;

-- 🔧 PASO 2: Simular query del comprador (con filtros)
SELECT '🔍 QUERY SIMULADA DEL COMPRADOR:' as diagnostico;

SELECT 
    id,
    name as "Producto",
    stock_quantity as "Stock Visible",
    is_public as "¿Público?",
    CASE 
        WHEN stock_quantity > 0 THEN '✅ Se muestra al comprador'
        ELSE '❌ NO se muestra (stock 0)'
    END as "¿Visible Comprador?",
    CASE 
        WHEN is_public = true THEN '✅ Producto público'
        ELSE '❌ Producto privado'
    END as "¿Es Público?"
FROM public.products 
WHERE name ILIKE '%calcoman%'
AND is_public = true
AND stock_quantity > 0
ORDER BY created_at DESC;

-- 🔧 PASO 3: Verificar si hay diferencias entre productos
SELECT '🔍 COMPARACIÓN DETALLADA:' as diagnostico;

SELECT 
    name as "Producto",
    stock_quantity as "Stock",
    is_public as "Público",
    seller_id as "Vendedor ID",
    updated_at as "Última Modificación",
    CASE 
        WHEN stock_quantity > 0 AND is_public = true THEN '✅ DEBERÍA APARECER'
        WHEN stock_quantity <= 0 THEN '❌ Sin stock'
        WHEN is_public = false THEN '❌ No público'
        ELSE '⚠️ Otro problema'
    END as "Estado Para Comprador"
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY stock_quantity DESC;

-- 🔧 PASO 4: Verificar si hay cache o datos duplicados
SELECT '🔍 VERIFICANDO DUPLICADOS O PROBLEMAS:' as diagnostico;

SELECT 
    COUNT(*) as "Total Productos Calcomanías",
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as "Con Stock",
    COUNT(CASE WHEN is_public = true THEN 1 END) as "Públicos",
    COUNT(CASE WHEN stock_quantity > 0 AND is_public = true THEN 1 END) as "Visibles al Comprador"
FROM public.products 
WHERE name ILIKE '%calcoman%';

-- 🔧 PASO 5: Verificar actualizaciones recientes
SELECT '🔍 ACTUALIZACIONES RECIENTES:' as diagnostico;

SELECT 
    name as "Producto",
    stock_quantity as "Stock Actual",
    updated_at as "Última Actualización",
    CASE 
        WHEN updated_at > NOW() - INTERVAL '1 hour' THEN '✅ Actualizado recientemente'
        WHEN updated_at > NOW() - INTERVAL '1 day' THEN '⚠️ Actualizado hoy'
        ELSE '❌ No actualizado recientemente'
    END as "¿Actualización Reciente?"
FROM public.products 
WHERE name ILIKE '%calcoman%'
ORDER BY updated_at DESC;

-- 🔧 PASO 6: Verificar logs de trigger (ver si se ejecutó)
SELECT '🔍 VERIFICANDO SI EL TRIGGER SE EJECUTÓ:' as diagnostico;

-- Buscar órdenes de calcomanías para carros
SELECT 
    o.id as "ID Orden",
    o.status as "Status",
    o.customer_name as "Cliente",
    oi.product_name as "Producto",
    oi.quantity as "Cantidad",
    o.created_at as "Fecha Orden",
    CASE 
        WHEN o.status = 'accepted' THEN '✅ Trigger debería haberse ejecutado'
        WHEN o.status = 'delivered' THEN '⚠️ Ya entregado, trigger pudo ejecutarse'
        ELSE '❌ Trigger no se ejecutó'
    END as "¿Trigger Ejecutado?"
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
WHERE oi.product_name ILIKE '%calcoman%carros%'
ORDER BY o.created_at DESC
LIMIT 5;

SELECT '🎯 DIAGNÓSTICO COMPLETADO - REVISA LOS RESULTADOS' as resultado;
