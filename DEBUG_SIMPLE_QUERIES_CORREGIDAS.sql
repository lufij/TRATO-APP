-- CONSULTAS SIMPLES PARA DEBUG RÁPIDO - VERSIÓN CORREGIDA
-- ========================================================
-- Ejecuta estas consultas una por una para identificar el problema

-- 1. ¿HAY ÓRDENES RECIENTES?
SELECT COUNT(*) as total_ordenes_hoy
FROM orders 
WHERE DATE(created_at AT TIME ZONE 'America/Guatemala') = CURRENT_DATE;

-- 2. ¿CUÁNTAS POR STATUS?
SELECT status, COUNT(*) as cantidad
FROM orders 
WHERE DATE(created_at AT TIME ZONE 'America/Guatemala') = CURRENT_DATE
GROUP BY status;

-- 3. ÚLTIMA ORDEN CREADA
SELECT 
    id,
    status,
    total_amount,
    customer_name,
    created_at AT TIME ZONE 'America/Guatemala' as hora_local
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;

-- 4. ÓRDENES PENDIENTES DE HOY
SELECT 
    id,
    status,
    total_amount,
    customer_name,
    created_at AT TIME ZONE 'America/Guatemala' as hora_creacion
FROM orders 
WHERE status = 'pending'
AND DATE(created_at AT TIME ZONE 'America/Guatemala') = CURRENT_DATE
ORDER BY created_at DESC;

-- 5. ÓRDENES QUE FUERON ACEPTADAS HOY
SELECT 
    id,
    status,
    total_amount,
    customer_name,
    created_at AT TIME ZONE 'America/Guatemala' as hora_creacion,
    accepted_at AT TIME ZONE 'America/Guatemala' as hora_aceptacion
FROM orders 
WHERE status = 'accepted'
AND DATE(created_at AT TIME ZONE 'America/Guatemala') = CURRENT_DATE
ORDER BY accepted_at DESC;

-- 6. BUSCAR ÓRDENES CON PROBLEMAS DE COHERENCIA
SELECT 
    id,
    status,
    accepted_at,
    'Status accepted pero sin timestamp' as problema
FROM orders 
WHERE status = 'accepted' AND accepted_at IS NULL
AND created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    id,
    status,
    accepted_at,
    'Status pending pero con timestamp' as problema
FROM orders 
WHERE status = 'pending' AND accepted_at IS NOT NULL
AND created_at >= NOW() - INTERVAL '24 hours';

-- 7. VER ACTIVIDAD RECIENTE (últimas 2 horas)
SELECT 
    id,
    status,
    total_amount,
    created_at AT TIME ZONE 'America/Guatemala' as creada,
    updated_at AT TIME ZONE 'America/Guatemala' as actualizada,
    CASE 
        WHEN updated_at > created_at THEN 'Modificada'
        ELSE 'Original'
    END as estado
FROM orders 
WHERE created_at >= NOW() - INTERVAL '2 hours'
ORDER BY updated_at DESC;

-- 8. VERIFICAR SI HAY DUPLICADOS (mismo total, mismo horario aprox)
SELECT 
    total_amount,
    customer_name,
    COUNT(*) as duplicados,
    STRING_AGG(id::text, ', ') as order_ids
FROM orders 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY total_amount, customer_name
HAVING COUNT(*) > 1;
