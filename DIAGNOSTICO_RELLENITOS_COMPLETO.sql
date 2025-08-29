-- DIAGNÓSTICO COMPLETO DEL PROBLEMA DE STOCK DE RELLENITOS
-- =========================================================
-- 
-- Ejecuta este script en Supabase SQL Editor para identificar exactamente 
-- qué está pasando con la orden de rellenitos de manjar

-- 1. BUSCAR ÓRDENES DE RELLENITOS DE HOY
SELECT 
  '=== ÓRDENES DE RELLENITOS DE HOY ===' as titulo;

SELECT 
  o.id as order_id,
  o.status,
  o.created_at,
  o.seller_id,
  o.buyer_id,
  o.total_amount,
  oi.id as order_item_id,
  oi.product_id,
  oi.daily_product_id,
  oi.product_name,
  oi.quantity,
  oi.product_type,
  oi.unit_price,
  oi.total_price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id  
WHERE oi.product_name ILIKE '%rellenito%'
AND o.created_at >= CURRENT_DATE
ORDER BY o.created_at DESC;

-- 2. VERIFICAR PRODUCTOS DISPONIBLES DE RELLENITOS
SELECT 
  '=== PRODUCTOS DEL DÍA - RELLENITOS ===' as titulo;

SELECT 
  id,
  name,
  stock_quantity,
  is_available,
  expires_at,
  created_at,
  seller_id
FROM daily_products 
WHERE name ILIKE '%rellenito%'
AND expires_at > NOW()
ORDER BY created_at DESC;

-- 3. VERIFICAR PRODUCTOS REGULARES DE RELLENITOS  
SELECT 
  '=== PRODUCTOS REGULARES - RELLENITOS ===' as titulo;

SELECT 
  id,
  name,
  stock_quantity,
  is_available,
  created_at,
  seller_id
FROM products 
WHERE name ILIKE '%rellenito%'
ORDER BY created_at DESC;

-- 4. ANÁLISIS CRUZADO - IDENTIFICAR PROBLEMAS
SELECT 
  '=== ANÁLISIS DE COINCIDENCIAS ===' as titulo;

WITH rellenito_orders AS (
  SELECT 
    o.id as order_id,
    o.status,
    oi.product_id,
    oi.daily_product_id,
    oi.product_name,
    oi.quantity,
    oi.product_type
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id  
  WHERE oi.product_name ILIKE '%rellenito%'
  AND o.created_at >= CURRENT_DATE
)
SELECT 
  ro.order_id,
  ro.status,
  ro.product_name,
  ro.quantity,
  ro.product_type,
  ro.product_id,
  ro.daily_product_id,
  -- Buscar en productos del día
  dp.id as found_daily_id,
  dp.name as found_daily_name,
  dp.stock_quantity as daily_stock,
  dp.is_available as daily_available,
  -- Buscar en productos regulares
  p.id as found_regular_id,
  p.name as found_regular_name,
  p.stock_quantity as regular_stock,
  p.is_available as regular_available,
  -- Diagnóstico
  CASE 
    WHEN ro.product_type = 'daily' AND dp.id IS NULL THEN '❌ PRODUCTO DEL DÍA NO ENCONTRADO'
    WHEN ro.product_type = 'regular' AND p.id IS NULL THEN '❌ PRODUCTO REGULAR NO ENCONTRADO'
    WHEN ro.product_type = 'daily' AND dp.stock_quantity < ro.quantity THEN '⚠️ STOCK INSUFICIENTE (DAILY)'
    WHEN ro.product_type = 'regular' AND p.stock_quantity < ro.quantity THEN '⚠️ STOCK INSUFICIENTE (REGULAR)'
    WHEN ro.status = 'pending' THEN '⏳ ORDEN PENDIENTE - VENDEDOR DEBE ACEPTAR'
    WHEN ro.status = 'accepted' AND ro.product_type = 'daily' AND dp.stock_quantity >= ro.quantity THEN '❌ STOCK NO DESCONTADO'
    WHEN ro.status = 'accepted' AND ro.product_type = 'regular' AND p.stock_quantity >= ro.quantity THEN '❌ STOCK NO DESCONTADO'
    ELSE '✅ TODO CORRECTO'
  END as diagnostico
FROM rellenito_orders ro
LEFT JOIN daily_products dp ON (
  (ro.product_type = 'daily' AND ro.daily_product_id = dp.id) OR
  (ro.product_type = 'daily' AND ro.product_id = dp.id) OR
  (ro.product_type IS NULL AND ro.daily_product_id = dp.id)
)
LEFT JOIN products p ON (
  (ro.product_type = 'regular' AND ro.product_id = p.id) OR
  (ro.product_type IS NULL AND ro.product_id = p.id)
);

-- 5. RESUMEN DEL PROBLEMA
SELECT 
  '=== RESUMEN Y RECOMENDACIONES ===' as titulo;

WITH problem_summary AS (
  SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN o.status = 'accepted' THEN 1 END) as accepted_orders,
    SUM(oi.quantity) as total_quantity
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id  
  WHERE oi.product_name ILIKE '%rellenito%'
  AND o.created_at >= CURRENT_DATE
)
SELECT 
  'Total órdenes de rellenitos hoy: ' || total_orders as info,
  'Órdenes pendientes: ' || pending_orders as pendientes,
  'Órdenes aceptadas: ' || accepted_orders as aceptadas,
  'Cantidad total pedida: ' || total_quantity as cantidad,
  CASE 
    WHEN pending_orders > 0 THEN '📋 ACCIÓN: Vendedor debe aceptar órdenes pendientes'
    WHEN accepted_orders > 0 THEN '🔍 VERIFICAR: ¿Por qué no se descontó el stock automáticamente?'
    ELSE '✅ No hay órdenes de rellenitos pendientes'
  END as recomendacion
FROM problem_summary;
