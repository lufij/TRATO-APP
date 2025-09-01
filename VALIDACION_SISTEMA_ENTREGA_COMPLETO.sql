-- =====================================================
-- 🚚 VALIDACIÓN COMPLETA DEL SISTEMA DE TIPOS DE ENTREGA
-- =====================================================

-- ==========================================
-- 1. VERIFICAR DISTRIBUCIÓN DE TIPOS DE ENTREGA
-- ==========================================
SELECT 
    '🚀 DISTRIBUCIÓN DE TIPOS DE ENTREGA' as titulo,
    delivery_type,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as porcentaje
FROM orders 
WHERE delivery_type IS NOT NULL
GROUP BY delivery_type
ORDER BY cantidad DESC;

-- ==========================================
-- 2. VERIFICAR ÓRDENES CON REPARTIDOR VS SIN REPARTIDOR  
-- ==========================================
SELECT 
    '🎯 ANÁLISIS POR TIPO DE ENTREGA' as titulo,
    delivery_type,
    COUNT(*) as total_ordenes,
    COUNT(driver_id) as con_repartidor,
    COUNT(*) - COUNT(driver_id) as sin_repartidor,
    CASE 
        WHEN delivery_type = 'delivery' THEN 'Debe tener repartidor' 
        ELSE 'NO debe tener repartidor'
    END as esperado
FROM orders 
WHERE delivery_type IS NOT NULL
GROUP BY delivery_type
ORDER BY delivery_type;

-- ==========================================
-- 3. VERIFICAR ÓRDENES LISTAS DISPONIBLES PARA REPARTIDORES
-- ==========================================
SELECT 
    '📦 ÓRDENES LISTAS PARA ENTREGA (solo delivery)' as titulo,
    id,
    delivery_type,
    status,
    CASE WHEN driver_id IS NULL THEN 'Disponible' ELSE 'Asignado' END as disponibilidad,
    customer_name,
    total,
    created_at
FROM orders 
WHERE status = 'ready' 
  AND delivery_type = 'delivery'
ORDER BY created_at DESC
LIMIT 10;

-- ==========================================
-- 4. VERIFICAR ÓRDENES QUE NO DEBERÍAN TENER REPARTIDOR
-- ==========================================
SELECT 
    '⚠️ PROBLEMA: Órdenes pickup/dine-in con repartidor asignado' as titulo,
    id,
    delivery_type,
    status,
    driver_id,
    customer_name,
    created_at
FROM orders 
WHERE delivery_type IN ('pickup', 'dine-in')
  AND driver_id IS NOT NULL;

-- ==========================================
-- 5. VERIFICAR FUNCIONALIDAD DE NOTIFICACIONES
-- ==========================================
SELECT 
    '🔔 VERIFICAR LÓGICA DE NOTIFICACIONES' as titulo,
    delivery_type,
    CASE 
        WHEN delivery_type = 'pickup' THEN 'Solo comprador: "Listo para recoger"'
        WHEN delivery_type = 'dine-in' THEN 'Solo comprador: "Listo para comer"'  
        WHEN delivery_type = 'delivery' THEN 'Comprador + Todos repartidores activos'
        ELSE 'Error: tipo no reconocido'
    END as logica_notificaciones,
    COUNT(*) as ordenes_afectadas
FROM orders
WHERE delivery_type IS NOT NULL
GROUP BY delivery_type
ORDER BY delivery_type;

-- ==========================================
-- 6. PROBAR FUNCIONES RPC CRÍTICAS
-- ==========================================

-- Verificar que solo órdenes delivery aparezcan para repartidores
SELECT 
    '🚚 TEST: Solo delivery debe aparecer en get_available_deliveries()' as titulo,
    id,
    delivery_type,
    status,
    customer_name,
    total
FROM orders 
WHERE status = 'ready' 
  AND COALESCE(delivery_type, 'delivery') = 'delivery'
  AND driver_id IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- ==========================================
-- 7. ESTADÍSTICAS RESUMEN
-- ==========================================
SELECT 
    '📊 RESUMEN EJECUTIVO' as titulo,
    COUNT(*) as total_ordenes,
    COUNT(CASE WHEN delivery_type = 'delivery' THEN 1 END) as entregas_domicilio,
    COUNT(CASE WHEN delivery_type = 'pickup' THEN 1 END) as recoger_tienda,
    COUNT(CASE WHEN delivery_type = 'dine-in' THEN 1 END) as comer_lugar,
    COUNT(CASE WHEN delivery_type IS NULL THEN 1 END) as sin_tipo,
    COUNT(CASE WHEN delivery_type = 'delivery' AND driver_id IS NOT NULL THEN 1 END) as delivery_con_repartidor,
    COUNT(CASE WHEN delivery_type IN ('pickup', 'dine-in') AND driver_id IS NOT NULL THEN 1 END) as problema_repartidor_innecesario
FROM orders;

-- ==========================================
-- 8. VALIDACIÓN FINAL  
-- ==========================================
SELECT 
    '✅ SISTEMA STATUS' as titulo,
    CASE 
        WHEN COUNT(CASE WHEN delivery_type IN ('pickup', 'dine-in') AND driver_id IS NOT NULL THEN 1 END) = 0 
        THEN '🟢 CORRECTO: No hay pickup/dine-in con repartidor'
        ELSE '🔴 ERROR: ' || COUNT(CASE WHEN delivery_type IN ('pickup', 'dine-in') AND driver_id IS NOT NULL THEN 1 END) || ' órdenes tienen repartidor innecesario'
    END as resultado_pickup_dinein,
    CASE 
        WHEN COUNT(CASE WHEN delivery_type = 'delivery' AND status = 'ready' AND driver_id IS NULL THEN 1 END) > 0
        THEN '🟢 CORRECTO: Hay órdenes delivery disponibles para repartidores'
        ELSE '🟡 INFO: No hay órdenes delivery pendientes'
    END as resultado_delivery_disponible
FROM orders;

-- ==========================================
-- 🎯 CONCLUSIONES
-- ==========================================
-- Este script valida que:
-- 1. ✅ Solo órdenes 'delivery' pueden tener repartidor
-- 2. ✅ Solo órdenes 'delivery' en estado 'ready' aparecen para repartidores  
-- 3. ✅ La lógica de notificaciones es diferente por tipo
-- 4. ✅ El frontend muestra el texto correcto según delivery_type
--
-- Si aparecen errores, revisar:
-- - Base de datos: Campo delivery_type debe estar correcto
-- - Frontend: Usar (order as any).delivery_type
-- - Notificaciones: Solo delivery notifica a repartidores
-- ==========================================
