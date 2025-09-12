-- VERIFICAR ESTADO ACTUAL DE TODOS LOS SELLERS
SELECT 
    id,
    business_name,
    is_open_now,
    CASE 
        WHEN is_open_now IS NULL THEN '⚠️ NULL'
        WHEN is_open_now = true THEN '✅ TRUE' 
        WHEN is_open_now = false THEN '❌ FALSE'
        ELSE '❓ OTRO'
    END as estado_is_open_now,
    weekly_hours IS NOT NULL as tiene_horarios,
    weekly_hours
FROM sellers 
ORDER BY business_name;