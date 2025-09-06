-- ============================================================================
-- 🔍 DEBUG: ¿POR QUÉ LA FUNCIÓN RETORNA "PRODUCTO NO DISPONIBLE"?
-- ============================================================================

-- 1. Verificar el producto del día específico (Cerveza)
SELECT 
    id,
    name,
    price,
    stock_quantity,
    is_available,
    expires_at,
    seller_id,
    -- Validaciones que hace la función
    CASE WHEN expires_at > NOW() THEN '✅ NO EXPIRADO' ELSE '❌ EXPIRADO' END as validacion_expiry,
    CASE WHEN stock_quantity > 0 THEN '✅ CON STOCK' ELSE '❌ SIN STOCK' END as validacion_stock,
    CASE WHEN is_available THEN '✅ DISPONIBLE' ELSE '❌ NO DISPONIBLE' END as validacion_disponible,
    CASE WHEN seller_id IS NOT NULL THEN '✅ TIENE VENDEDOR' ELSE '❌ SIN VENDEDOR' END as validacion_vendedor
FROM daily_products 
WHERE id = '83ae3e47-9d07-4991-8bcb-2796d28f6c8d';

-- 2. Probar la función paso a paso con el producto específico
SELECT add_to_cart_safe(
    '05b3d386-57ac-4206-bafe-a988bfb33150'::uuid,  -- Usuario real
    '83ae3e47-9d07-4991-8bcb-2796d28f6c8d'::uuid,  -- Cerveza específica
    1,                                               -- Cantidad
    'daily'                                          -- Tipo daily
) as resultado_funcion;

-- 3. Verificar si se agregó (debería estar ahí)
SELECT 
    product_name,
    product_type,
    quantity,
    created_at
FROM cart_items 
WHERE user_id = '05b3d386-57ac-4206-bafe-a988bfb33150'
  AND product_id = '83ae3e47-9d07-4991-8bcb-2796d28f6c8d'
ORDER BY created_at DESC;

-- 4. Ver todos los items del carrito
SELECT 
    product_name,
    product_type,
    quantity,
    seller_id,
    created_at
FROM cart_items 
WHERE user_id = '05b3d386-57ac-4206-bafe-a988bfb33150'
ORDER BY created_at DESC;

-- ============================================================================
-- 🎯 HIPÓTESIS:
-- ============================================================================
-- La función está funcionando CORRECTAMENTE (agrega al carrito)
-- Pero retorna "success: false" por alguna validación que falla DESPUÉS de agregar
-- Posibles causas:
-- 1. seller_id es NULL en daily_products
-- 2. Alguna validación falla pero ya se insertó el registro
-- 3. Excepción después de la inserción
