-- ============================================================================
-- 🎯 SOLUCIÓN DEFINITIVA: PRODUCTOS DEL DÍA NO SE PUEDEN AGREGAR AL CARRITO
-- ============================================================================
-- PROBLEMA IDENTIFICADO: BusinessProfile.tsx usa 'regular' para todos los productos
-- SOLUCIÓN: Crear función handleAddDailyToCart específica para productos del día

-- 1️⃣ VERIFICAR ESTADO ACTUAL DE LA FUNCIÓN add_to_cart_safe
SELECT 
    routine_name,
    routine_type,
    external_name,
    specific_name
FROM information_schema.routines
WHERE routine_name = 'add_to_cart_safe';

-- 2️⃣ VERIFICAR ESTRUCTURA DE CART_ITEMS
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ VERIFICAR DATOS DE daily_products PROBLEMA (Cerveza)
SELECT 
    id,
    name,
    price,
    stock_quantity,
    is_available,
    expires_at,
    seller_id,
    -- Verificar si está vencido
    CASE 
        WHEN expires_at < NOW() THEN '🔴 EXPIRADO'
        WHEN stock_quantity <= 0 THEN '📦 SIN STOCK'
        WHEN NOT is_available THEN '❌ DESHABILITADO'
        ELSE '✅ DISPONIBLE'
    END as estado
FROM daily_products 
WHERE name ILIKE '%cerveza%'
ORDER BY created_at DESC;

-- 4️⃣ PROBAR LA FUNCIÓN DIRECTAMENTE CON PRODUCTO DEL DÍA
-- (Usar el ID real del producto de cerveza encontrado arriba)
SELECT add_to_cart_safe(
    '4a09b7fd-8e78-4a11-a8f6-0ea805f15b4b'::uuid,  -- ID del comprador
    (SELECT id FROM daily_products WHERE name ILIKE '%cerveza%' LIMIT 1),  -- ID del producto del día
    1,  -- cantidad
    'daily'  -- tipo: daily
);

-- 5️⃣ VERIFICAR QUE SE AGREGÓ AL CARRITO CORRECTAMENTE
SELECT 
    ci.id,
    ci.product_id,
    ci.product_type,
    ci.product_name,
    ci.quantity,
    ci.created_at,
    -- Verificar que product_type sea 'daily'
    CASE 
        WHEN ci.product_type = 'daily' THEN '✅ CORRECTO'
        ELSE '❌ INCORRECTO'
    END as verification
FROM cart_items ci
WHERE ci.user_id = '4a09b7fd-8e78-4a11-a8f6-0ea805f15b4b'
ORDER BY ci.created_at DESC
LIMIT 5;

-- 6️⃣ LIMPIAR CARRITO PARA NUEVAS PRUEBAS (OPCIONAL)
-- DELETE FROM cart_items WHERE user_id = '4a09b7fd-8e78-4a11-a8f6-0ea805f15b4b';

-- 7️⃣ VERIFICAR POLÍTICAS RLS EN CART_ITEMS
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cart_items'
ORDER BY policyname;

-- ============================================================================
-- 📋 DIAGNÓSTICO ESPERADO:
-- ============================================================================
-- ✅ add_to_cart_safe debe existir y funcionar
-- ✅ cart_items debe tener columna product_type
-- ✅ daily_products debe tener productos disponibles
-- ✅ La función debe poder agregar productos tipo 'daily' al carrito
-- ✅ RLS debe permitir al usuario ver sus items del carrito

-- 🔧 SI LA FUNCIÓN FALLA: El problema está en la base de datos
-- 🔧 SI LA FUNCIÓN FUNCIONA: El problema está en BusinessProfile.tsx (frontend)

-- ============================================================================
-- 🎯 NEXT STEPS DESPUÉS DE EJECUTAR:
-- ============================================================================
-- 1. Si la función falla → Arreglar función SQL
-- 2. Si la función funciona → Modificar BusinessProfile.tsx para detectar productos del día
-- 3. Verificar que el frontend use product_type: 'daily' para productos del día
