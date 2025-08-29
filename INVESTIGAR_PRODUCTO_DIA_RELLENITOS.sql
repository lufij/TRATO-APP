-- INVESTIGACIÓN ESPECÍFICA: PRODUCTO DEL DÍA - RELLENITOS DE MANJAR
-- ================================================================
-- 
-- Como es un PRODUCTO DEL DÍA, debe estar en la tabla 'daily_products'
-- y tener un campo 'expires_at' válido

-- 1. BUSCAR EL PRODUCTO DEL DÍA ESPECÍFICO
SELECT 
  '=== PRODUCTO DEL DÍA: RELLENITOS DE MANJAR ===' as seccion;

SELECT 
  id,
  name,
  description,
  price,
  stock_quantity,
  is_available,
  expires_at,
  created_at,
  seller_id,
  image_url
FROM daily_products 
WHERE name ILIKE '%rellenito%'
AND expires_at > NOW()  -- Solo productos no expirados
ORDER BY created_at DESC;

-- 2. BUSCAR ÓRDENES DE HOY CON ESTE PRODUCTO
SELECT 
  '=== ÓRDENES DE HOY CON RELLENITOS (PRODUCTO DEL DÍA) ===' as seccion;

SELECT 
  o.id as order_id,
  o.status,
  o.created_at,
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

-- 3. VERIFICAR COINCIDENCIA ENTRE ORDER_ITEMS Y DAILY_PRODUCTS
SELECT 
  '=== ANÁLISIS DE COINCIDENCIAS (PRODUCTOS DEL DÍA) ===' as seccion;

WITH rellenito_orders AS (
  SELECT 
    o.id as order_id,
    o.status,
    o.created_at as order_time,
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
  ro.order_time,
  ro.product_name,
  ro.quantity,
  ro.product_type,
  ro.product_id,
  ro.daily_product_id,
  -- Información del producto del día
  dp.id as found_daily_id,
  dp.name as found_daily_name,
  dp.stock_quantity as current_stock,
  dp.is_available,
  dp.expires_at,
  dp.created_at as product_created,
  -- Diagnóstico específico para productos del día
  CASE 
    WHEN ro.product_type != 'daily' THEN '⚠️ TIPO INCORRECTO: Debería ser "daily"'
    WHEN dp.id IS NULL AND ro.daily_product_id IS NOT NULL THEN '❌ DAILY_PRODUCT_ID NO ENCONTRADO'
    WHEN dp.id IS NULL AND ro.product_id IS NOT NULL THEN '❌ PRODUCT_ID NO ENCONTRADO EN DAILY_PRODUCTS'
    WHEN dp.id IS NULL THEN '❌ PRODUCTO DEL DÍA NO ENCONTRADO'
    WHEN dp.expires_at <= NOW() THEN '⏰ PRODUCTO EXPIRADO'
    WHEN NOT dp.is_available THEN '❌ PRODUCTO NO DISPONIBLE'
    WHEN ro.status = 'pending' THEN '⏳ ORDEN PENDIENTE - VENDEDOR DEBE ACEPTAR'
    WHEN ro.status = 'accepted' AND dp.stock_quantity >= ro.quantity THEN '❌ STOCK NO DESCONTADO AUTOMÁTICAMENTE'
    WHEN ro.status = 'accepted' AND dp.stock_quantity < ro.quantity THEN '✅ STOCK YA DESCONTADO'
    ELSE '🔍 REVISAR MANUALMENTE'
  END as diagnostico,
  -- Detalles técnicos
  CASE 
    WHEN ro.daily_product_id IS NOT NULL THEN ro.daily_product_id
    ELSE ro.product_id 
  END as id_usado_en_orden,
  dp.id as id_real_producto
FROM rellenito_orders ro
LEFT JOIN daily_products dp ON (
  dp.id = COALESCE(ro.daily_product_id, ro.product_id)
  AND dp.expires_at > NOW()
);

-- 4. VERIFICAR SI HAY MÚLTIPLES PRODUCTOS DEL DÍA CON EL MISMO NOMBRE
SELECT 
  '=== VERIFICAR DUPLICADOS DE RELLENITOS ===' as seccion;

SELECT 
  id,
  name,
  stock_quantity,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at <= NOW() THEN '⏰ EXPIRADO'
    WHEN NOT is_available THEN '❌ NO DISPONIBLE'
    ELSE '✅ ACTIVO'
  END as estado
FROM daily_products 
WHERE name ILIKE '%rellenito%'
ORDER BY created_at DESC;

-- 5. RESUMEN Y ACCIÓN REQUERIDA
SELECT 
  '=== RESUMEN PARA PRODUCTOS DEL DÍA ===' as seccion;

WITH summary AS (
  SELECT 
    COUNT(DISTINCT dp.id) as productos_activos,
    COUNT(DISTINCT o.id) as ordenes_hoy,
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as ordenes_pendientes,
    COUNT(CASE WHEN o.status = 'accepted' THEN 1 END) as ordenes_aceptadas,
    SUM(oi.quantity) as total_pedido,
    MAX(dp.stock_quantity) as stock_actual
  FROM daily_products dp
  LEFT JOIN order_items oi ON (
    oi.product_name ILIKE '%rellenito%' AND
    (oi.daily_product_id = dp.id OR oi.product_id = dp.id)
  )
  LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= CURRENT_DATE
  WHERE dp.name ILIKE '%rellenito%'
  AND dp.expires_at > NOW()
)
SELECT 
  productos_activos || ' productos del día activos' as info1,
  ordenes_hoy || ' órdenes hoy' as info2,
  ordenes_pendientes || ' pendientes' as info3,
  ordenes_aceptadas || ' aceptadas' as info4,
  total_pedido || ' unidades pedidas' as info5,
  stock_actual || ' stock actual' as info6,
  CASE 
    WHEN productos_activos = 0 THEN '❌ NO HAY PRODUCTOS DEL DÍA ACTIVOS'
    WHEN productos_activos > 1 THEN '⚠️ HAY MÚLTIPLES PRODUCTOS - VERIFICAR DUPLICADOS'
    WHEN ordenes_pendientes > 0 THEN '📋 HAY ÓRDENES PENDIENTES POR ACEPTAR'
    WHEN ordenes_aceptadas > 0 AND stock_actual >= total_pedido THEN '❌ STOCK NO SE DESCONTÓ AUTOMÁTICAMENTE'
    WHEN ordenes_aceptadas > 0 AND stock_actual < total_pedido THEN '✅ STOCK SE DESCONTÓ CORRECTAMENTE'
    ELSE '🔍 NECESITA INVESTIGACIÓN MANUAL'
  END as accion_requerida
FROM summary;
