-- VALIDACIÓN RÁPIDA: Verificar estado del sistema de tipos de entrega

-- 1. Distribución básica
SELECT 
    'DISTRIBUCIÓN BÁSICA' as seccion,
    delivery_type,
    COUNT(*) as cantidad
FROM orders 
GROUP BY delivery_type
ORDER BY cantidad DESC;

-- 2. Órdenes problemáticas (pickup/dine-in con repartidor)
SELECT 
    'ÓRDENES PROBLEMÁTICAS' as seccion,
    COUNT(*) as problemas_encontrados
FROM orders 
WHERE delivery_type IN ('pickup', 'dine-in')
  AND driver_id IS NOT NULL;

-- 3. Órdenes delivery listas para repartidores
SELECT 
    'DELIVERY DISPONIBLES' as seccion,
    COUNT(*) as ordenes_listas
FROM orders 
WHERE status = 'ready' 
  AND delivery_type = 'delivery'
  AND driver_id IS NULL;

-- 4. Resumen por tipo
SELECT 
    'RESUMEN POR TIPO' as seccion,
    delivery_type,
    COUNT(*) as total,
    COUNT(driver_id) as con_repartidor,
    CASE 
        WHEN delivery_type = 'delivery' THEN 'OK - Puede tener repartidor'
        WHEN delivery_type IN ('pickup', 'dine-in') AND COUNT(driver_id) = 0 THEN 'OK - Sin repartidor'
        WHEN delivery_type IN ('pickup', 'dine-in') AND COUNT(driver_id) > 0 THEN 'ERROR - No debería tener repartidor'
        ELSE 'Revisar'
    END as estado
FROM orders 
WHERE delivery_type IS NOT NULL
GROUP BY delivery_type
ORDER BY delivery_type;
