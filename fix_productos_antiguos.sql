-- CORREGIR PRODUCTOS ANTIGUOS REVIVIDOS
-- =====================================================

-- 1. Desactivar productos creados ANTES de hoy (no deben aparecer)
UPDATE daily_products 
SET is_available = false
WHERE created_at::date < CURRENT_DATE;

-- 2. Solo mantener activos los productos creados HOY
UPDATE daily_products 
SET 
    is_available = true,
    expires_at = CURRENT_DATE + INTERVAL '23 hours 59 minutes 59 seconds'
WHERE created_at::date = CURRENT_DATE;

-- 3. Verificar estado final correcto
SELECT 
    name,
    created_at::date as fecha_creado,
    expires_at,
    is_available,
    CASE 
        WHEN created_at::date < CURRENT_DATE THEN '❌ PRODUCTO ANTIGUO (DESACTIVADO)'
        WHEN created_at::date = CURRENT_DATE AND is_available = true THEN '✅ PRODUCTO DE HOY (ACTIVO)'
        ELSE '❓ REVISAR ESTADO'
    END as estado_correcto
FROM daily_products
ORDER BY created_at DESC;
