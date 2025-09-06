-- ============================================================================
-- 🔧 SOLUCIÓN RÁPIDA: VERIFICAR Y CORREGIR SELLER_ID EN DAILY_PRODUCTS
-- ============================================================================

-- 1. Ver si daily_products tiene seller_id NULL
SELECT 
    id,
    name,
    seller_id,
    CASE 
        WHEN seller_id IS NULL THEN '❌ SELLER_ID ES NULL'
        ELSE '✅ SELLER_ID OK'
    END as diagnostico
FROM daily_products 
WHERE name = 'Cerveza';

-- 2. Si seller_id es NULL, corregirlo con un vendedor válido
-- (Ejecutar solo si el diagnóstico muestra NULL)
UPDATE daily_products 
SET seller_id = (
    SELECT id FROM users LIMIT 1  -- Usar el primer usuario como vendedor temporalmente
)
WHERE seller_id IS NULL 
  AND name = 'Cerveza';

-- 3. Verificar que se corrigió
SELECT 
    id,
    name,
    seller_id,
    CASE 
        WHEN seller_id IS NULL THEN '❌ AÚN NULL'
        ELSE '✅ CORREGIDO'
    END as resultado
FROM daily_products 
WHERE name = 'Cerveza';

-- ============================================================================
-- 🎯 TEORÍA:
-- ============================================================================
-- La función add_to_cart_safe falla en esta línea:
-- IF product_seller_id IS NULL THEN
--     RETURN QUERY SELECT false, 'Error: Producto sin vendedor asignado'::TEXT, NULL::UUID;
-- 
-- Pero ANTES de esa validación ya insertó en cart_items
-- Por eso vemos el producto en el carrito pero con error
