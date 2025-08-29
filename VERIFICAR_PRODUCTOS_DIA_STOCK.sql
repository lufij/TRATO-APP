-- =====================================================
-- 🔍 VERIFICAR PRODUCTOS DEL DÍA - STOCK DISPLAY
-- =====================================================

-- Verificar todos los productos del día activos
SELECT 
    id,
    name,
    stock_quantity,
    price,
    expires_at,
    seller_id,
    CASE 
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        WHEN stock_quantity <= 3 THEN '🔥 ÚLTIMAS UNIDADES'
        WHEN stock_quantity <= 5 THEN '⚠️ STOCK BAJO'
        ELSE '✅ STOCK DISPONIBLE'
    END as estado_stock,
    CASE 
        WHEN expires_at > NOW() THEN '⏰ DISPONIBLE'
        ELSE '❌ EXPIRADO'
    END as estado_tiempo,
    EXTRACT(HOUR FROM (expires_at - NOW())) as horas_restantes
FROM public.daily_products 
WHERE DATE(expires_at) = CURRENT_DATE
ORDER BY stock_quantity DESC, expires_at;

-- Verificar específicamente si el rellenito de frijol está ahí
SELECT 
    'PRODUCTO ESPECÍFICO:' as info,
    id,
    name,
    stock_quantity,
    price,
    expires_at,
    created_at
FROM public.daily_products 
WHERE name ILIKE '%rellenito%' 
   OR name ILIKE '%frijol%'
ORDER BY created_at DESC;
