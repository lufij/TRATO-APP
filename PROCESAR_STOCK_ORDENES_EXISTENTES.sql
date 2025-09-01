-- =====================================================
-- 🔄 PROCESAR STOCK MANUALMENTE PARA ÓRDENES EXISTENTES
-- =====================================================

-- Este script procesará todas las órdenes "delivered" y "ready" 
-- que tienen productos del día para descontar el stock correctamente

-- PASO 1: Identificar órdenes que necesitan procesamiento
SELECT 
    'ÓRDENES A PROCESAR:' as titulo,
    o.id as order_id,
    o.status,
    oi.product_name,
    oi.quantity,
    dp.stock_quantity as stock_antes
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN daily_products dp ON oi.product_id = dp.id
WHERE o.status IN ('delivered', 'ready', 'accepted')
  AND oi.product_type = 'daily'
  AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY o.created_at DESC;

-- PASO 2: PROCESAR AUTOMÁTICAMENTE TODAS LAS ÓRDENES
DO $$
DECLARE
    orden_record RECORD;
    stock_antes INTEGER;
    stock_despues INTEGER;
BEGIN
    RAISE NOTICE '🔄 INICIANDO PROCESAMIENTO DE STOCK...';
    
    -- Procesar todas las órdenes delivered/ready con productos del día
    FOR orden_record IN 
        SELECT DISTINCT o.id, o.status, o.created_at
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN daily_products dp ON oi.product_id = dp.id
        WHERE o.status IN ('delivered', 'ready', 'accepted')
          AND oi.product_type = 'daily'
          AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY o.created_at ASC
    LOOP
        -- Obtener stock antes
        SELECT COALESCE(SUM(dp.stock_quantity), 0) INTO stock_antes
        FROM order_items oi
        JOIN daily_products dp ON oi.product_id = dp.id
        WHERE oi.order_id = orden_record.id AND oi.product_type = 'daily';
        
        -- Ejecutar función de procesamiento
        PERFORM process_order_stock(orden_record.id);
        
        -- Obtener stock después
        SELECT COALESCE(SUM(dp.stock_quantity), 0) INTO stock_despues
        FROM order_items oi
        JOIN daily_products dp ON oi.product_id = dp.id
        WHERE oi.order_id = orden_record.id AND oi.product_type = 'daily';
        
        RAISE NOTICE '✅ Orden % (%) - Stock: % → %', 
            orden_record.id, orden_record.status, stock_antes, stock_despues;
    END LOOP;
    
    RAISE NOTICE '🎉 PROCESAMIENTO COMPLETADO!';
END $$;

-- PASO 3: VERIFICAR RESULTADOS
SELECT 
    'VERIFICACIÓN FINAL:' as titulo,
    dp.name,
    dp.stock_quantity as stock_actual,
    COALESCE(SUM(oi.quantity), 0) as total_vendido,
    COUNT(DISTINCT o.id) as ordenes_procesadas
FROM daily_products dp
LEFT JOIN order_items oi ON dp.id = oi.product_id 
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.status IN ('delivered', 'ready', 'accepted')
  AND oi.product_type = 'daily'
  AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY dp.id, dp.name, dp.stock_quantity
ORDER BY dp.name;

-- MOSTRAR ESTADO FINAL DE PRODUCTOS DEL DÍA
SELECT 
    '📊 ESTADO FINAL PRODUCTOS DEL DÍA:' as titulo,
    name,
    stock_quantity,
    expires_at,
    CASE 
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO'
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        ELSE '✅ DISPONIBLE'
    END as estado
FROM daily_products
ORDER BY created_at DESC;
