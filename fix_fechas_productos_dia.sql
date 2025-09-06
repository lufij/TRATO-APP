-- SOLUCIÓN: Arreglar fechas de expiración de productos del día

-- 1. Arreglar productos creados hoy (cambiar expiración para que sea hoy 23:59)
UPDATE daily_products 
SET expires_at = CURRENT_DATE + INTERVAL '23 hours 59 minutes 59 seconds'
WHERE created_at::date = CURRENT_DATE;

-- 2. Arreglar productos antiguos (cambiar expiración para que sea hoy 23:59)
UPDATE daily_products 
SET expires_at = CURRENT_DATE + INTERVAL '23 hours 59 minutes 59 seconds'
WHERE expires_at < NOW();

-- 3. Verificar los cambios
SELECT 
    name,
    expires_at as nueva_fecha_expiracion,
    CASE WHEN expires_at >= NOW() AND expires_at <= (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second') 
         THEN 'AHORA SÍ APARECERÁ' 
         ELSE 'AÚN HAY PROBLEMA' END as estado
FROM daily_products
ORDER BY created_at DESC;
