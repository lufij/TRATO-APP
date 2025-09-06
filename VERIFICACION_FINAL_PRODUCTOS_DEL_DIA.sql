-- ============================================================================
-- ✅ VERIFICACIÓN FINAL: PRODUCTOS DEL DÍA AL CARRITO
-- ============================================================================

-- 🎯 1. OBTENER INFORMACIÓN DEL USUARIO ACTUAL
SELECT 
    id as user_id,
    email,
    created_at
FROM users 
ORDER BY created_at DESC
LIMIT 3;

-- 🎯 2. OBTENER PRODUCTOS DEL DÍA DISPONIBLES
SELECT 
    id as product_id,
    name,
    price,
    stock_quantity,
    is_available,
    expires_at,
    -- Estado del producto
    CASE 
        WHEN expires_at < NOW() THEN '🔴 EXPIRADO'
        WHEN stock_quantity <= 0 THEN '📦 SIN STOCK'  
        WHEN NOT is_available THEN '❌ DESHABILITADO'
        ELSE '✅ DISPONIBLE'
    END as estado,
    -- Tiempo restante
    CASE 
        WHEN expires_at > NOW() THEN 
            EXTRACT(HOUR FROM (expires_at - NOW()))::text || ' horas restantes'
        ELSE 'Expirado'
    END as tiempo_restante
FROM daily_products 
WHERE is_available = true 
  AND stock_quantity > 0 
  AND expires_at > NOW()
ORDER BY expires_at ASC
LIMIT 5;

-- 🎯 3. LIMPIAR CARRITO PARA PRUEBA LIMPIA
DELETE FROM cart_items 
WHERE user_id IN (
    SELECT id FROM users ORDER BY created_at DESC LIMIT 1
);

-- 🎯 4. PROBAR AGREGAR PRODUCTO DEL DÍA AL CARRITO
DO $$
DECLARE
    test_user_id uuid;
    test_product_id uuid;
    result text;
BEGIN
    -- Obtener usuario de prueba
    SELECT id INTO test_user_id 
    FROM users 
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Obtener producto del día disponible
    SELECT id INTO test_product_id
    FROM daily_products 
    WHERE is_available = true 
      AND stock_quantity > 0 
      AND expires_at > NOW()
    LIMIT 1;
    
    -- Intentar agregar al carrito
    IF test_user_id IS NOT NULL AND test_product_id IS NOT NULL THEN
        SELECT add_to_cart_safe(test_user_id, test_product_id, 1, 'daily') INTO result;
        RAISE NOTICE '🎯 TEST RESULT: %', result;
    ELSE
        RAISE NOTICE '❌ NO HAY USUARIO O PRODUCTO PARA PROBAR';
    END IF;
END $$;

-- 🎯 5. VERIFICAR QUE SE AGREGÓ CORRECTAMENTE
SELECT 
    ci.id,
    ci.product_id,
    ci.product_type,
    ci.product_name,
    ci.quantity,
    ci.created_at,
    -- Verificación
    CASE 
        WHEN ci.product_type = 'daily' THEN '✅ TIPO CORRECTO'
        ELSE '❌ TIPO INCORRECTO: ' || ci.product_type
    END as verificacion_tipo,
    -- Producto existe
    CASE 
        WHEN dp.id IS NOT NULL THEN '✅ PRODUCTO EXISTE'
        ELSE '❌ PRODUCTO NO EXISTE'
    END as verificacion_producto
FROM cart_items ci
LEFT JOIN daily_products dp ON dp.id = ci.product_id AND ci.product_type = 'daily'
WHERE ci.user_id IN (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)
ORDER BY ci.created_at DESC
LIMIT 3;

-- 🎯 6. VERIFICAR FUNCIÓN add_to_cart_safe
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'add_to_cart_safe';

-- ============================================================================
-- 📋 RESULTADOS ESPERADOS:
-- ============================================================================
-- 1. Usuario encontrado ✅
-- 2. Productos del día disponibles ✅  
-- 3. Carrito limpio ✅
-- 4. TEST RESULT: success ✅
-- 5. Cart item con product_type = 'daily' ✅
-- 6. Función add_to_cart_safe existe ✅

-- ============================================================================
-- 🚀 SI TODO ESTÁ BIEN:
-- ============================================================================
-- El problema estaba en BusinessProfile.tsx que usaba 'regular' para todos los productos
-- ✅ YA CORREGIDO: Creamos handleAddDailyToCart() 
-- ✅ YA CORREGIDO: DailyProductCard usa handleAddDailyToCart()
-- ✅ PRODUCTOS REGULARES: Siguen usando handleAddToCart() con 'regular'

-- 🎯 PRUEBA EN EL FRONTEND: Los productos del día ahora deberían agregarse sin error
