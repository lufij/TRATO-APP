-- =====================================================
-- ARREGLAR PRODUCTOS DEL DÍA EXPIRADOS Y NUEVO PRODUCTO
-- =====================================================

-- 1. Actualizar fechas de expiración de TODOS los productos del día
UPDATE public.daily_products 
SET expires_at = NOW() + INTERVAL '1 day'
WHERE expires_at <= NOW() OR expires_at IS NULL;

-- 2. Asegurar que todos tengan stock y estén disponibles
UPDATE public.daily_products 
SET 
    is_available = true,
    stock_quantity = COALESCE(stock_quantity, 10)
WHERE is_available IS NULL 
   OR is_available = false 
   OR stock_quantity IS NULL 
   OR stock_quantity <= 0;

-- 3. Verificar estado actual después de la actualización
SELECT 
    'DESPUÉS DE ACTUALIZACIÓN' as seccion,
    id,
    name,
    is_available,
    stock_quantity,
    expires_at,
    CASE 
        WHEN expires_at > NOW() AND stock_quantity > 0 AND is_available = true THEN 'VÁLIDO'
        WHEN expires_at <= NOW() THEN 'EXPIRADO'
        WHEN stock_quantity <= 0 THEN 'SIN STOCK'  
        WHEN is_available = false THEN 'NO DISPONIBLE'
        ELSE 'PROBLEMA DESCONOCIDO'
    END as estado
FROM public.daily_products
ORDER BY name;

-- 4. Probar la función de validación con productos específicos
SELECT 
    'PRUEBA VALIDACIÓN DAILY' as seccion,
    dp.name,
    dp.id,
    v.is_valid,
    v.error_message
FROM public.daily_products dp
CROSS JOIN LATERAL validate_and_get_product_data(dp.id, 'daily') v
ORDER BY dp.name
LIMIT 5;

-- 5. Mostrar información de empresa/vendedor
SELECT DISTINCT
    'INFORMACIÓN VENDEDOR' as seccion,
    dp.seller_id,
    u.name as vendedor_nombre,
    u.business_name,
    COUNT(dp.id) as productos_del_dia
FROM public.daily_products dp
LEFT JOIN public.users u ON dp.seller_id = u.id
GROUP BY dp.seller_id, u.name, u.business_name
ORDER BY productos_del_dia DESC;
