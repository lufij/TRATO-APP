-- CONSULTAS DE DEBUG PARA SUPABASE - VERSIÓN CORREGIDA
-- ======================================================
-- Ejecuta estas consultas EN ORDEN para entender el problema

-- 1. VER TODAS LAS ÓRDENES RECIENTES (últimas 24 horas)
SELECT 
    id,
    status,
    total_amount,
    buyer_id,
    seller_id,
    driver_id,
    created_at AT TIME ZONE 'America/Guatemala' as created_local,
    accepted_at AT TIME ZONE 'America/Guatemala' as accepted_local,
    ready_at AT TIME ZONE 'America/Guatemala' as ready_local,
    delivered_at AT TIME ZONE 'America/Guatemala' as delivered_local,
    delivery_type,
    customer_name,
    phone_number,
    delivery_address
FROM orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 2. CONTAR ÓRDENES POR STATUS (para ver distribución)
SELECT 
    status,
    COUNT(*) as cantidad,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '24 hours') as porcentaje
FROM orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY cantidad DESC;

-- 3. VER ÓRDENES PROBLEMÁTICAS (aceptadas pero sin timestamps correctos)
SELECT 
    id,
    status,
    created_at AT TIME ZONE 'America/Guatemala' as created_local,
    accepted_at AT TIME ZONE 'America/Guatemala' as accepted_local,
    updated_at AT TIME ZONE 'America/Guatemala' as updated_local,
    CASE 
        WHEN status = 'accepted' AND accepted_at IS NULL THEN 'ERROR: Aceptada sin timestamp'
        WHEN status = 'pending' AND accepted_at IS NOT NULL THEN 'ERROR: Pending con timestamp'
        ELSE 'OK'
    END as estado_coherencia
FROM orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
AND (
    (status = 'accepted' AND accepted_at IS NULL) OR
    (status = 'pending' AND accepted_at IS NOT NULL)
)
ORDER BY created_at DESC;

-- 4. VER HISTORIAL DE CAMBIOS EN ÓRDENES (si hay triggers o logs)
SELECT 
    id,
    status,
    created_at AT TIME ZONE 'America/Guatemala' as created_local,
    updated_at AT TIME ZONE 'America/Guatemala' as updated_local,
    accepted_at AT TIME ZONE 'America/Guatemala' as accepted_local,
    (updated_at - created_at) as tiempo_transcurrido,
    CASE 
        WHEN updated_at > created_at THEN 'Modificada'
        ELSE 'Sin cambios'
    END as fue_modificada
FROM orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 10;

-- 5. BUSCAR ÓRDENES DE UN VENDEDOR ESPECÍFICO (reemplaza 'TU_SELLER_ID')
-- SELECT 
--     id,
--     status,
--     total_amount,
--     created_at AT TIME ZONE 'America/Guatemala' as created_local,
--     accepted_at AT TIME ZONE 'America/Guatemala' as accepted_local,
--     customer_name
-- FROM orders 
-- WHERE seller_id = 'TU_SELLER_ID'
-- AND created_at >= NOW() - INTERVAL '24 hours'
-- ORDER BY created_at DESC;

-- 6. VERIFICAR INTEGRIDAD DE DATOS
SELECT 
    'Órdenes sin buyer_id' as problema,
    COUNT(*) as cantidad
FROM orders 
WHERE buyer_id IS NULL
UNION ALL
SELECT 
    'Órdenes sin seller_id' as problema,
    COUNT(*) as cantidad
FROM orders 
WHERE seller_id IS NULL
UNION ALL
SELECT 
    'Órdenes sin total_amount' as problema,
    COUNT(*) as cantidad
FROM orders 
WHERE total_amount IS NULL
UNION ALL
SELECT 
    'Órdenes aceptadas sin timestamp' as problema,
    COUNT(*) as cantidad
FROM orders 
WHERE status = 'accepted' AND accepted_at IS NULL;

-- 7. VER TIMING DE PROCESAMIENTO DE ÓRDENES
SELECT 
    id,
    status,
    EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60 as minutos_para_aceptar,
    EXTRACT(EPOCH FROM (ready_at - accepted_at)) / 60 as minutos_para_preparar,
    EXTRACT(EPOCH FROM (delivered_at - ready_at)) / 60 as minutos_para_entregar,
    delivery_type
FROM orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
AND status IN ('accepted', 'ready', 'delivered', 'completed')
ORDER BY created_at DESC
LIMIT 10;
