-- =====================================================
-- 🔍 DIAGNÓSTICO CHECKOUT - PRODUCTOS DEL DÍA vs REGULARES
-- =====================================================

-- Verificar productos en cart_items
SELECT 
    'PRODUCTOS EN CARRITO:' as info,
    ci.id as cart_item_id,
    ci.product_id,
    ci.product_type,
    ci.quantity,
    ci.created_at
FROM public.cart_items ci 
ORDER BY ci.created_at DESC
LIMIT 10;

-- Verificar productos del día específicamente
SELECT 
    'PRODUCTOS DEL DÍA DISPONIBLES:' as info,
    dp.id,
    dp.name,
    dp.stock_quantity,
    dp.expires_at,
    CASE 
        WHEN dp.expires_at > NOW() THEN '✅ DISPONIBLE'
        ELSE '❌ EXPIRADO'
    END as estado
FROM public.daily_products dp
WHERE dp.name ILIKE '%rellenito%'
   OR dp.name ILIKE '%frijol%'
ORDER BY dp.created_at DESC;

-- Verificar productos regulares
SELECT 
    'PRODUCTOS REGULARES:' as info,
    p.id,
    p.name,
    p.stock_quantity,
    p.is_available
FROM public.products p
WHERE p.name ILIKE '%rellenito%'
   OR p.name ILIKE '%frijol%'
ORDER BY p.created_at DESC;

-- Verificar cart_items para productos del día específicamente
SELECT 
    'CART ITEMS CON PRODUCTOS DEL DÍA:' as info,
    ci.id,
    ci.product_id,
    ci.product_type,
    ci.quantity,
    dp.name as daily_product_name,
    dp.stock_quantity,
    dp.expires_at
FROM public.cart_items ci
LEFT JOIN public.daily_products dp ON ci.product_id = dp.id
WHERE ci.product_type = 'daily'
   OR dp.id IS NOT NULL
ORDER BY ci.created_at DESC;
