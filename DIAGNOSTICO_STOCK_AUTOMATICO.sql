-- =====================================================
-- 🔍 DIAGNÓSTICO COMPLETO - PROBLEMA DE STOCK AUTOMÁTICO
-- =====================================================
-- Ejecutar este script para identificar por qué el stock no se descuenta

-- 🔧 PASO 1: Verificar si el trigger existe
SELECT '🔍 VERIFICANDO TRIGGER DE STOCK:' as diagnostico;

SELECT 
    'TRIGGER - ' || trigger_name as "Trigger",
    event_manipulation as "Evento",
    action_timing as "Timing",
    'EXISTE' as "Estado"
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_order_confirm';

-- 🔧 PASO 2: Verificar si la función existe
SELECT '🔍 VERIFICANDO FUNCIÓN DE STOCK:' as diagnostico;

SELECT 
    'FUNCIÓN - ' || routine_name as "Función",
    routine_type as "Tipo",
    'EXISTE' as "Estado"
FROM information_schema.routines 
WHERE routine_name = 'process_order_stock';

-- 🔧 PASO 3: Analizar la orden más reciente
SELECT '🔍 ANALIZANDO ORDEN MÁS RECIENTE:' as diagnostico;

WITH recent_order AS (
    SELECT 
        o.id,
        o.status,
        o.customer_name,
        o.total_amount,
        o.created_at,
        o.updated_at,
        o.accepted_at,
        o.ready_at,
        o.delivered_at
    FROM public.orders o
    ORDER BY o.created_at DESC
    LIMIT 1
)
SELECT 
    'ORDEN - ' || ro.id as "ID de Orden",
    ro.customer_name as "Cliente",
    ro.status as "Status Actual",
    ro.total_amount as "Total",
    CASE 
        WHEN ro.accepted_at IS NOT NULL THEN '✅ Aceptada'
        ELSE '❌ No aceptada'
    END as "¿Aceptada?",
    CASE 
        WHEN ro.ready_at IS NOT NULL THEN '✅ Lista'
        ELSE '❌ No lista'
    END as "¿Lista?",
    CASE 
        WHEN ro.delivered_at IS NOT NULL THEN '✅ Entregada'
        ELSE '❌ No entregada'
    END as "¿Entregada?",
    CASE 
        WHEN ro.status = 'confirmed' THEN '✅ Status correcto para trigger'
        ELSE '❌ Status incorrecto: ' || ro.status
    END as "¿Status Trigger?"
FROM recent_order ro;

-- 🔧 PASO 4: Analizar order_items de la orden más reciente
SELECT '🔍 ANALIZANDO ORDER_ITEMS:' as diagnostico;

WITH recent_order AS (
    SELECT id FROM public.orders ORDER BY created_at DESC LIMIT 1
)
SELECT 
    'ITEM - ' || oi.id as "ID Item",
    oi.product_name as "Producto",
    oi.quantity as "Cantidad",
    CASE 
        WHEN oi.product_id IS NOT NULL THEN '✅ Tiene product_id: ' || oi.product_id
        ELSE '❌ product_id es NULL'
    END as "¿Product ID?",
    oi.total_price as "Precio Total"
FROM public.order_items oi
JOIN recent_order ro ON oi.order_id = ro.id;

-- 🔧 PASO 5: Verificar stock actual de productos involucrados
SELECT '🔍 VERIFICANDO STOCK ACTUAL:' as diagnostico;

WITH recent_order AS (
    SELECT id FROM public.orders ORDER BY created_at DESC LIMIT 1
)
SELECT 
    'PRODUCTO - ' || p.id as "ID Producto",
    p.name as "Nombre",
    COALESCE(p.stock_quantity, 0) as "Stock Actual",
    CASE 
        WHEN p.stock_quantity IS NOT NULL THEN '✅ Tiene campo stock'
        ELSE '❌ Campo stock es NULL'
    END as "¿Campo Stock?"
FROM public.products p
WHERE p.id IN (
    SELECT oi.product_id 
    FROM public.order_items oi
    JOIN recent_order ro ON oi.order_id = ro.id
    WHERE oi.product_id IS NOT NULL
);

-- 🔧 PASO 6: Simular manualmente lo que debería hacer el trigger
SELECT '🔍 SIMULACIÓN DEL TRIGGER:' as diagnostico;

WITH recent_order AS (
    SELECT id, status FROM public.orders ORDER BY created_at DESC LIMIT 1
),
items_to_process AS (
    SELECT 
        oi.product_id,
        oi.quantity,
        oi.product_name,
        p.stock_quantity as stock_actual
    FROM public.order_items oi
    JOIN recent_order ro ON oi.order_id = ro.id
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.product_id IS NOT NULL
)
SELECT 
    'SIMULACIÓN - ' || itp.product_name as "Producto",
    itp.stock_actual as "Stock Antes",
    itp.quantity as "Cantidad Vendida",
    (itp.stock_actual - itp.quantity) as "Stock Esperado",
    CASE 
        WHEN (itp.stock_actual - itp.quantity) >= 0 THEN '✅ Stock suficiente'
        ELSE '❌ Stock insuficiente'
    END as "¿Stock OK?"
FROM items_to_process itp;

-- 🔧 PASO 7: Verificar logs del trigger (si existen)
SELECT '🔍 BUSCANDO LOGS DEL TRIGGER:' as diagnostico;

-- Intentar encontrar cualquier log o error relacionado
SELECT 
    'LOG - ' || schemaname as "Schema",
    tablename as "Tabla",
    'Trigger logs no disponibles en vista estándar' as "Estado"
FROM pg_tables 
WHERE tablename LIKE '%log%' OR tablename LIKE '%audit%'
LIMIT 3;

-- 🔧 PASO 8: DIAGNÓSTICO FINAL Y RECOMENDACIONES
SELECT '🎯 DIAGNÓSTICO FINAL:' as diagnostico;

SELECT 
    'PROBLEMA IDENTIFICADO' as "Resultado",
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_stock_on_order_confirm'
        ) THEN '❌ TRIGGER NO EXISTE - Necesita instalarse'
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'process_order_stock'
        ) THEN '❌ FUNCIÓN NO EXISTE - Necesita instalarse'
        WHEN EXISTS (
            SELECT 1 FROM public.orders 
            WHERE created_at > NOW() - INTERVAL '1 hour'
            AND status != 'confirmed'
            ORDER BY created_at DESC 
            LIMIT 1
        ) THEN '❌ ORDEN NO ESTÁ EN STATUS "confirmed" - Trigger solo funciona con "confirmed"'
        WHEN EXISTS (
            WITH recent_order AS (SELECT id FROM public.orders ORDER BY created_at DESC LIMIT 1)
            SELECT 1 FROM public.order_items oi
            JOIN recent_order ro ON oi.order_id = ro.id
            WHERE oi.product_id IS NULL
        ) THEN '❌ ORDER_ITEMS SIN product_id - Trigger necesita product_id válido'
        ELSE '✅ Configuración parece correcta - Revisar logs del trigger'
    END as "Causa Probable";

-- 📋 RECOMENDACIONES ESPECÍFICAS
SELECT '📋 RECOMENDACIONES:' as diagnostico;

SELECT 
    'ACCIÓN REQUERIDA' as "Paso",
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_stock_on_order_confirm'
        ) THEN '1. Ejecutar script FIX_STOCK_AUTOMATICO_DEFINITIVO.sql'
        WHEN EXISTS (
            SELECT 1 FROM public.orders 
            WHERE created_at > NOW() - INTERVAL '1 hour'
            AND status != 'confirmed'
            ORDER BY created_at DESC 
            LIMIT 1
        ) THEN '2. Cambiar status de orden a "confirmed" manualmente para probar'
        ELSE '3. Ejecutar trigger manualmente para la orden más reciente'
    END as "Descripción";

SELECT '🔧 SCRIPT FINALIZADO - REVISA LOS RESULTADOS ARRIBA' as resultado;
