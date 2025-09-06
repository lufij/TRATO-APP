-- CORREGIR FECHAS DE EXPIRACIÓN - PROBLEMA UTC/LOCAL
-- =======================================================

-- Guatemala es UTC-6, entonces medianoche local (23:59) = 05:59 UTC del día siguiente

-- 1. Actualizar productos activos de hoy para que expiren a medianoche LOCAL
UPDATE daily_products 
SET expires_at = '2025-09-06T05:59:59.999Z'  -- Medianoche Guatemala = 05:59 UTC del día siguiente
WHERE created_at::date = CURRENT_DATE 
  AND is_available = true;

-- 2. Verificar el resultado
SELECT 
    name,
    expires_at,
    expires_at AT TIME ZONE 'America/Guatemala' as expires_at_local,
    'Ahora expira a medianoche Guatemala (23:59 local)' as estado
FROM daily_products
WHERE created_at::date = CURRENT_DATE 
  AND is_available = true;
