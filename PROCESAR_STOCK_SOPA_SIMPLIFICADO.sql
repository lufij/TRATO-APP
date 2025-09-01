-- =====================================================
-- 🔄 PROCESAR STOCK SOLO PARA SOPA 4 QUESOS (SIMPLIFICADO)
-- =====================================================

-- Ya que solo nos importa la "Sopa 4 quesos" actual, 
-- vamos a procesarla directamente

-- PASO 1: Ver órdenes de Sopa 4 quesos que necesitan procesamiento
SELECT 
    'ÓRDENES SOPA 4 QUESOS:' as titulo,
    o.id as order_id,
    o.status,
    oi.product_name,
    oi.quantity,
    o.created_at
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.product_name = 'Sopa 4 quesos'
  AND o.status IN ('delivered', 'ready', 'accepted')
  AND oi.product_type = 'daily'
  AND o.created_at >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY o.created_at DESC;

-- PASO 2: Verificar stock actual de Sopa 4 quesos
SELECT 
    'STOCK ACTUAL SOPA:' as titulo,
    name,
    stock_quantity,
    expires_at,
    CASE 
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO'
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        ELSE '✅ DISPONIBLE'
    END as estado
FROM daily_products
WHERE name = 'Sopa 4 quesos';

-- PASO 3: Descontar stock manualmente para órdenes delivered/ready
DO $$
DECLARE
    orden_record RECORD;
    total_a_descontar INTEGER := 0;
    stock_actual INTEGER;
    sopa_id UUID;
BEGIN
    -- Obtener ID y stock actual de Sopa 4 quesos
    SELECT id, stock_quantity INTO sopa_id, stock_actual
    FROM daily_products
    WHERE name = 'Sopa 4 quesos'
    AND expires_at > NOW()
    LIMIT 1;
    
    IF sopa_id IS NULL THEN
        RAISE NOTICE '⚠️ No se encontró Sopa 4 quesos activa';
        RETURN;
    END IF;
    
    RAISE NOTICE '📦 Sopa 4 quesos encontrada - Stock actual: %', stock_actual;
    
    -- Calcular total a descontar de órdenes delivered/ready
    SELECT COALESCE(SUM(oi.quantity), 0) INTO total_a_descontar
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.product_name = 'Sopa 4 quesos'
      AND o.status IN ('delivered', 'ready', 'accepted')
      AND oi.product_type = 'daily'
      AND o.created_at >= CURRENT_DATE - INTERVAL '2 days'
      AND oi.product_id = sopa_id;
    
    RAISE NOTICE '📊 Total a descontar: % unidades', total_a_descontar;
    
    -- Actualizar stock directamente
    IF total_a_descontar > 0 THEN
        UPDATE daily_products 
        SET stock_quantity = GREATEST(0, stock_quantity - total_a_descontar)
        WHERE id = sopa_id;
        
        RAISE NOTICE '✅ Stock actualizado: % → %', 
            stock_actual, GREATEST(0, stock_actual - total_a_descontar);
    ELSE
        RAISE NOTICE 'ℹ️ No hay órdenes para procesar';
    END IF;
    
END $$;

-- PASO 4: VERIFICACIÓN FINAL
SELECT 
    'RESULTADO FINAL:' as titulo,
    dp.name,
    dp.stock_quantity as stock_final,
    COALESCE(SUM(oi.quantity), 0) as total_vendido_hoy,
    COUNT(DISTINCT o.id) as ordenes_total
FROM daily_products dp
LEFT JOIN order_items oi ON dp.id = oi.product_id 
LEFT JOIN orders o ON oi.order_id = o.id
WHERE dp.name = 'Sopa 4 quesos'
  AND dp.expires_at > NOW()
  AND (o.created_at >= CURRENT_DATE OR o.created_at IS NULL)
GROUP BY dp.id, dp.name, dp.stock_quantity;
