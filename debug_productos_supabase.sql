-- Análisis completo de productos del día - CORREGIDO para Supabase
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
    expires_at::date as fecha_expira,
    created_at::date as fecha_creado,
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
    created_at::date as fecha_creacion,
    created_at::time as hora_creacion,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN 'VIGENTE'
        WHEN expires_at <= NOW() THEN 'EXPIRADO'
    END as estado,
    is_available as disponible,
    stock_quantity as stock
FROM daily_products
WHERE created_at::date = '2025-09-05'
ORDER BY created_at DESC;

-- 4. ANÁLISIS DE FILTROS QUE USA LA APP
SELECT 
    'ANÁLISIS FILTROS APP' as seccion,
    id,
    name,
    stock_quantity,
    expires_at,
    CASE WHEN stock_quantity > 0 THEN 'SI' ELSE 'NO' END as "stock > 0",
    CASE WHEN expires_at >= NOW() THEN 'SI' ELSE 'NO' END as "no expirado",
    CASE WHEN expires_at <= (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second') THEN 'SI' ELSE 'NO' END as "expira hoy",
    CASE WHEN is_available = true THEN 'SI' ELSE 'NO' END as "disponible",
    CASE 
        WHEN stock_quantity > 0 
        AND expires_at >= NOW() 
        AND expires_at <= (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')
        AND is_available = true 
        THEN 'DEBERÍA APARECER'
        ELSE 'NO APARECE'
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
  AND expires_at <= (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')
  AND is_available = true;
