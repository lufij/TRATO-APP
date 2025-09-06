-- Análisis completo de productos del día
-- Fecha actual: 2025-09-05 (viernes)

-- 1. PRODUCTOS DEL DÍA: Estado general
SELECT 
    'PRODUCTOS DEL DÍA - ESTADO GENERAL' as seccion,
    COUNT(*) as total_productos,
    COUNT(CASE WHEN is_available = true THEN 1 END) as disponibles,
    COUNT(CASE WHEN is_available = false THEN 1 END) as no_disponibles,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as sin_stock
FROM daily_products;

-- 2. PRODUCTOS DEL DÍA: Fechas de expiración
SELECT 
    'FECHAS DE EXPIRACIÓN' as seccion,
    id,
    name,
    seller_id,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN 'VIGENTE'
        WHEN expires_at <= NOW() THEN 'EXPIRADO'
    END as estado_fecha,
    DATE(expires_at) as fecha_expira,
    DATE(created_at) as fecha_creado,
    is_available,
    stock_quantity
FROM daily_products
ORDER BY expires_at DESC;

-- 3. PRODUCTOS CREADOS HOY (2025-09-05)
SELECT 
    'PRODUCTOS CREADOS HOY' as seccion,
    id,
    name,
    seller_id,
    DATE(created_at) as fecha_creacion,
    TIME(created_at) as hora_creacion,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN '✅ VIGENTE'
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO'
    END as estado,
    is_available as disponible,
    stock_quantity as stock
FROM daily_products
WHERE DATE(created_at) = '2025-09-05'
ORDER BY created_at DESC;

-- 4. ANÁLISIS DE FILTROS QUE USA LA APP
-- Los filtros que usa getBusinessDailyProducts son:
-- - gt('stock_quantity', 0)
-- - gte('expires_at', new Date().toISOString()) 
-- - lte('expires_at', endOfDay.toISOString()) donde endOfDay = hoy 23:59:59

SELECT 
    'ANÁLISIS FILTROS APP' as seccion,
    id,
    name,
    stock_quantity,
    expires_at,
    -- Filtro 1: stock > 0
    CASE WHEN stock_quantity > 0 THEN '✅' ELSE '❌' END as "stock > 0",
    -- Filtro 2: expires_at >= NOW()
    CASE WHEN expires_at >= NOW() THEN '✅' ELSE '❌' END as "no expirado",
    -- Filtro 3: expires_at <= HOY 23:59:59
    CASE WHEN expires_at <= (DATE(NOW()) + INTERVAL '1 day - 1 second') THEN '✅' ELSE '❌' END as "expira hoy",
    -- Filtro 4: is_available = true
    CASE WHEN is_available = true THEN '✅' ELSE '❌' END as "disponible",
    -- RESULTADO FINAL
    CASE 
        WHEN stock_quantity > 0 
        AND expires_at >= NOW() 
        AND expires_at <= (DATE(NOW()) + INTERVAL '1 day - 1 second')
        AND is_available = true 
        THEN '🟢 DEBERÍA APARECER'
        ELSE '🔴 NO APARECE'
    END as resultado_app
FROM daily_products
ORDER BY created_at DESC;

-- 5. PRODUCTOS QUE DEBERÍAN APARECER SEGÚN FILTROS APP
SELECT 
    'PRODUCTOS VÁLIDOS PARA APP' as seccion,
    COUNT(*) as total_validos
FROM daily_products
WHERE stock_quantity > 0 
  AND expires_at >= NOW() 
  AND expires_at <= (DATE(NOW()) + INTERVAL '1 day - 1 second')
  AND is_available = true;

-- 6. DIAGNÓSTICO: ¿Por qué no aparecen?
SELECT 
    'DIAGNÓSTICO PROBLEMAS' as seccion,
    name,
    CASE 
        WHEN stock_quantity <= 0 THEN '❌ Sin stock (' || stock_quantity || ')'
        WHEN expires_at < NOW() THEN '❌ Expirado (' || expires_at || ')'
        WHEN expires_at > (DATE(NOW()) + INTERVAL '1 day - 1 second') THEN '❌ Expira después de hoy (' || expires_at || ')'
        WHEN is_available = false THEN '❌ Marcado como no disponible'
        ELSE '✅ Debería funcionar'
    END as problema
FROM daily_products
ORDER BY created_at DESC;
