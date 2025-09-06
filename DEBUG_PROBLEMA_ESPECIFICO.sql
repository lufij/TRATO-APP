-- CONSULTA ESPECÍFICA PARA EL PROBLEMA: ÓRDENES ACEPTADAS QUE SIGUEN APARECIENDO
-- =================================================================================

-- ESTA ES LA CONSULTA MÁS IMPORTANTE PARA TU PROBLEMA ESPECÍFICO:
-- "orden aceptada pero sigue estando disponible para aceptar"

-- 1. BUSCAR ÓRDENES QUE ESTÁN ACEPTADAS PERO PODRÍAN APARECER COMO PENDIENTES
SELECT 
    o.id,
    o.status as estado_actual,
    o.total_amount,
    o.customer_name,
    o.phone_number,
    o.created_at AT TIME ZONE 'America/Guatemala' as creada_hora_local,
    o.accepted_at AT TIME ZONE 'America/Guatemala' as aceptada_hora_local,
    o.updated_at AT TIME ZONE 'America/Guatemala' as ultima_actualizacion,
    -- Verificar coherencia
    CASE 
        WHEN o.status = 'accepted' AND o.accepted_at IS NOT NULL THEN 'CORRECTO'
        WHEN o.status = 'accepted' AND o.accepted_at IS NULL THEN 'ERROR: Sin timestamp'
        WHEN o.status = 'pending' AND o.accepted_at IS NOT NULL THEN 'ERROR: Timestamp sin status'
        ELSE 'REVISAR'
    END as coherencia_datos,
    -- Calcular tiempo transcurrido
    EXTRACT(EPOCH FROM (NOW() - o.updated_at)) / 60 as minutos_sin_actualizar
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '6 hours'  -- Solo últimas 6 horas
AND o.status IN ('pending', 'accepted')  -- Solo estados relevantes
ORDER BY o.updated_at DESC;

-- 2. BUSCAR ESPECÍFICAMENTE ÓRDENES PROBLEMÁTICAS (el caso que describes)
SELECT 
    'PROBLEMA DETECTADO' as alerta,
    o.id,
    o.status,
    o.customer_name,
    o.total_amount,
    o.accepted_at AT TIME ZONE 'America/Guatemala' as cuando_se_acepto,
    o.updated_at AT TIME ZONE 'America/Guatemala' as ultima_modificacion
FROM orders o
WHERE o.status = 'accepted' 
AND o.accepted_at IS NOT NULL
AND o.created_at >= NOW() - INTERVAL '12 hours'
AND EXISTS (
    -- Verificar si esta orden todavía aparecería en consultas de "disponibles"
    SELECT 1 FROM orders o2 
    WHERE o2.id = o.id 
    AND o2.status = 'accepted'
);

-- 3. SIMULAR LA CONSULTA QUE USA TU FRONTEND PARA CARGAR ÓRDENES DISPONIBLES
-- (Esta debería ser similar a lo que hace tu app para mostrar órdenes pendientes)
SELECT 
    o.id,
    o.status,
    o.total_amount,
    o.customer_name,
    o.phone_number,
    o.delivery_address,
    o.delivery_type,
    o.created_at AT TIME ZONE 'America/Guatemala' as hora_local,
    o.notes,
    o.customer_notes
FROM orders o
WHERE o.status = 'pending'  -- Solo pendientes
AND o.seller_id IS NOT NULL  -- Tienen vendedor asignado
AND o.created_at >= CURRENT_DATE  -- Solo de hoy
ORDER BY o.created_at DESC;

-- 4. VERIFICAR SI HAY ÓRDENES CON STATUS INCORRECTO
SELECT 
    'INCONSISTENCIA DETECTADA' as problema,
    o.id,
    o.status as estado_reportado,
    CASE 
        WHEN o.accepted_at IS NOT NULL AND o.ready_at IS NULL THEN 'Debería ser: accepted'
        WHEN o.ready_at IS NOT NULL AND o.picked_up_at IS NULL THEN 'Debería ser: ready'  
        WHEN o.picked_up_at IS NOT NULL AND o.delivered_at IS NULL THEN 'Debería ser: in_transit'
        WHEN o.delivered_at IS NOT NULL THEN 'Debería ser: delivered'
        ELSE 'Estado correcto'
    END as estado_esperado,
    o.created_at AT TIME ZONE 'America/Guatemala' as creada,
    o.accepted_at AT TIME ZONE 'America/Guatemala' as aceptada,
    o.ready_at AT TIME ZONE 'America/Guatemala' as lista,
    o.picked_up_at AT TIME ZONE 'America/Guatemala' as recogida,
    o.delivered_at AT TIME ZONE 'America/Guatemala' as entregada
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '12 hours'
ORDER BY o.created_at DESC;

-- 5. CONTAR CUÁNTAS ÓRDENES ESTÁN EN CADA ESTADO REAL VS ESPERADO
SELECT 
    'RESUMEN DE ESTADOS' as categoria,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reportadas,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_reportadas,
    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_reportadas,
    COUNT(CASE WHEN accepted_at IS NOT NULL AND status != 'pending' THEN 1 END) as realmente_aceptadas,
    COUNT(CASE WHEN accepted_at IS NOT NULL AND status = 'pending' THEN 1 END) as aceptadas_pero_pending
FROM orders 
WHERE created_at >= CURRENT_DATE;
