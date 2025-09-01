-- =====================================================
-- 🚨 FIX URGENTE: CHECKOUT NO TRANSFIERE PRODUCT_TYPE
-- =====================================================

-- PROBLEMA IDENTIFICADO: 
-- En BuyerCheckout.tsx línea ~390, los orderItems NO incluyen product_type
-- Por eso TODOS los productos del día se guardan como 'regular' (default)

-- SOLUCIÓN 1: ACTUALIZAR ÓRDENES EXISTENTES MAL MARCADAS
-- =====================================================

-- Paso 1: Identificar órdenes recientes mal marcadas
SELECT 
    'ÓRDENES MAL MARCADAS:' as diagnostico,
    o.id as order_id,
    o.created_at,
    oi.product_name,
    oi.product_type as tipo_actual,
    dp.id as daily_product_id,
    CASE 
        WHEN dp.id IS NOT NULL THEN 'daily'
        ELSE 'regular'
    END as tipo_correcto
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN daily_products dp ON oi.product_id = dp.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND oi.product_type != 'daily'
  AND dp.id IS NOT NULL;

-- Paso 2: CORREGIR product_type en órdenes mal marcadas
UPDATE order_items 
SET product_type = 'daily'
WHERE id IN (
    SELECT oi.id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN daily_products dp ON oi.product_id = dp.id
    WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
      AND oi.product_type != 'daily'
      AND dp.id IS NOT NULL
);

-- Paso 3: EJECUTAR TRIGGER MANUALMENTE para órdenes 'accepted' mal marcadas
DO $$
DECLARE
    orden_record RECORD;
BEGIN
    -- Buscar órdenes aceptadas recientes con productos del día
    FOR orden_record IN 
        SELECT DISTINCT o.id, o.status
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN daily_products dp ON oi.product_id = dp.id
        WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
          AND o.status = 'accepted'
          AND dp.id IS NOT NULL
    LOOP
        -- Llamar función de procesamiento de stock
        PERFORM process_order_stock(orden_record.id);
        
        RAISE NOTICE 'Procesado stock para orden: %', orden_record.id;
    END LOOP;
END $$;

-- VERIFICACIÓN: Comprobar corrección
-- =====================================================
SELECT 
    'VERIFICACIÓN DESPUÉS DEL FIX:' as check_name,
    COUNT(*) as total_items_con_daily_products,
    COUNT(CASE WHEN oi.product_type = 'daily' THEN 1 END) as correctamente_marcados,
    COUNT(CASE WHEN oi.product_type != 'daily' THEN 1 END) as aun_mal_marcados
FROM order_items oi
JOIN daily_products dp ON oi.product_id = dp.id
WHERE oi.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Mostrar productos del día después del fix
SELECT 
    'PRODUCTOS DEL DÍA DESPUÉS DEL FIX:' as titulo,
    oi.product_name,
    oi.product_type,
    oi.quantity,
    o.status,
    dp.stock_quantity as stock_actual
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN daily_products dp ON oi.product_id = dp.id
WHERE oi.created_at >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY oi.created_at DESC;
