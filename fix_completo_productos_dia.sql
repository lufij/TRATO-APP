-- ARREGLAR PRODUCTOS EXISTENTES Y PROBAR NUEVOS
-- =====================================================

-- 1. Arreglar productos creados hoy (que expiran mañana a las 06:00)
UPDATE daily_products 
SET expires_at = CURRENT_DATE + INTERVAL '23 hours 59 minutes 59 seconds'
WHERE created_at::date = CURRENT_DATE;

-- 2. Arreglar productos antiguos expirados
UPDATE daily_products 
SET expires_at = CURRENT_DATE + INTERVAL '23 hours 59 minutes 59 seconds'
WHERE expires_at < NOW();

-- 3. Verificar que todos los productos ahora cumplan los filtros
SELECT 
    name,
    expires_at,
    CASE 
        WHEN stock_quantity > 0 
        AND expires_at >= NOW() 
        AND expires_at <= (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')
        AND is_available = true 
        THEN '✅ AHORA APARECERÁ EN APP'
        ELSE '❌ AÚN HAY PROBLEMA'
    END as estado_final
FROM daily_products
ORDER BY created_at DESC;
