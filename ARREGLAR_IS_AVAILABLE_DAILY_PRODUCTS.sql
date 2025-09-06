-- ============================================================================
-- 🔍 VERIFICAR POR QUÉ is_available ES FALSE EN DAILY_PRODUCTS
-- ============================================================================

-- 1. Ver el estado actual de la cerveza
SELECT 
    id,
    name,
    is_available,
    stock_quantity,
    expires_at,
    seller_id,
    created_at
FROM daily_products 
WHERE name = 'Cerveza'
ORDER BY created_at DESC;

-- 2. Si is_available es false, corregirlo
UPDATE daily_products 
SET is_available = true
WHERE name = 'Cerveza'
  AND is_available = false;

-- 3. Verificar que se corrigió
SELECT 
    id,
    name,
    is_available,
    stock_quantity,
    CASE 
        WHEN is_available = true THEN '✅ DISPONIBLE'
        ELSE '❌ NO DISPONIBLE'
    END as estado_final
FROM daily_products 
WHERE name = 'Cerveza';

-- ============================================================================
-- 🎯 EL PROBLEMA REAL:
-- ============================================================================
-- BusinessProfile.tsx línea 256:
-- isDisabledByVendor: product.is_available === false
-- 
-- Si is_available = false → isDisabledByVendor = true → Muestra "No disponible"
-- 
-- SOLUCIÓN: Cambiar is_available a true en daily_products
