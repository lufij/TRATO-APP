-- =====================================================
-- TRATO - ARREGLAR VISUALIZACIÓN DE ZONA HORARIA
-- =====================================================
-- Este script verifica que las fechas estén correctas
-- para Guatemala (UTC-6)

-- 1. VERIFICAR ESTADO ACTUAL
SELECT 
    '=== ESTADO ACTUAL PRODUCTOS DÍA ===' as info,
    name,
    created_at AT TIME ZONE 'America/Guatemala' as created_at_local,
    expires_at AT TIME ZONE 'America/Guatemala' as expires_at_local,
    CASE 
        WHEN expires_at > NOW() THEN '✅ VIGENTE'
        ELSE '❌ EXPIRADO'
    END as estado,
    EXTRACT(HOUR FROM (expires_at AT TIME ZONE 'America/Guatemala')) as hora_expira_local,
    stock_quantity,
    is_available
FROM daily_products
WHERE created_at::date >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY created_at DESC;

-- 2. CALCULAR TIEMPO RESTANTE CORRECTO
WITH tiempo_restante AS (
    SELECT 
        name,
        expires_at,
        created_at,
        EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as horas_restantes,
        CASE 
            WHEN expires_at > NOW() THEN 
                FLOOR(EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600) || 'h ' ||
                FLOOR((EXTRACT(EPOCH FROM (expires_at - NOW())) % 3600) / 60) || 'm'
            ELSE 'EXPIRADO'
        END as tiempo_formateado
    FROM daily_products
    WHERE created_at::date >= CURRENT_DATE - INTERVAL '1 day'
)
SELECT 
    '=== TIEMPO RESTANTE CORRECTO ===' as info,
    name,
    tiempo_formateado,
    horas_restantes,
    CASE 
        WHEN horas_restantes > 0 AND horas_restantes < 24 THEN '✅ TIEMPO CORRECTO'
        WHEN horas_restantes <= 0 THEN '❌ EXPIRADO'
        ELSE '⚠️ REVISAR'
    END as validacion
FROM tiempo_restante
ORDER BY horas_restantes DESC;

-- 3. MOSTRAR DIFERENCIA UTC vs LOCAL
SELECT 
    '=== COMPARACIÓN UTC vs LOCAL ===' as info,
    name,
    expires_at as "UTC",
    expires_at AT TIME ZONE 'America/Guatemala' as "Guatemala Local",
    EXTRACT(HOUR FROM expires_at) as hora_utc,
    EXTRACT(HOUR FROM (expires_at AT TIME ZONE 'America/Guatemala')) as hora_local,
    CASE 
        WHEN EXTRACT(HOUR FROM (expires_at AT TIME ZONE 'America/Guatemala')) = 23
        THEN '✅ CORRECTO (11 PM local)'
        ELSE '❌ INCORRECTO'
    END as validacion_hora
FROM daily_products
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
