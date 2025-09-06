-- DIAGNÓSTICO ESPECÍFICO DEL PRODUCTO CERVEZA
-- =============================================

-- 1. Verificar productos del día con "Cerveza"
SELECT 
    'PRODUCTOS_CERVEZA' as seccion,
    dp.id, 
    dp.name, 
    dp.stock_quantity, 
    dp.expires_at, 
    dp.is_available,
    dp.seller_id,
    (dp.expires_at > NOW()) as no_expirado,
    (dp.stock_quantity > 0) as tiene_stock,
    ((dp.expires_at > NOW()) AND (dp.stock_quantity > 0) AND dp.is_available) as validacion_completa
FROM daily_products dp 
WHERE dp.name ILIKE '%cerveza%'
ORDER BY dp.created_at DESC;

-- 2. Probar la función de validación directamente
SELECT 
    'VALIDACION_FUNCION' as seccion,
    *
FROM validate_and_get_product_data(
    (SELECT id FROM daily_products WHERE name ILIKE '%cerveza%' LIMIT 1),
    'daily'
);

-- 3. Verificar si hay items en el carrito con este producto
SELECT 
    'CARRITO_CERVEZA' as seccion,
    ci.id,
    ci.product_id,
    ci.product_name,
    ci.product_type,
    ci.quantity,
    ci.user_id
FROM cart_items ci
WHERE ci.product_name ILIKE '%cerveza%'
   OR ci.product_id IN (SELECT id FROM daily_products WHERE name ILIKE '%cerveza%');

-- 4. Verificar estructura de daily_products para este producto específico
SELECT 
    'ESTRUCTURA_DETALLADA' as seccion,
    dp.*
FROM daily_products dp 
WHERE dp.name ILIKE '%cerveza%'
ORDER BY dp.created_at DESC
LIMIT 1;
