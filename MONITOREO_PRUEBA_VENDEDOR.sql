-- =====================================================
-- 🔍 MONITOREO COMPLETO - PRUEBA VENDEDOR
-- =====================================================

-- 1. Estado de la orden específica
SELECT 
    'ESTADO ORDEN ACTUAL:' as titulo,
    id,
    status,
    created_at,
    accepted_at,
    ready_at
FROM orders 
WHERE id = 'c55be40e-fd39-4d9b-a6b9-51e8e330f3eb';

-- 2. Items de esa orden
SELECT 
    'ITEMS DE LA ORDEN:' as titulo,
    oi.product_name,
    oi.product_type,
    oi.quantity,
    oi.product_id
FROM order_items oi
WHERE oi.order_id = 'c55be40e-fd39-4d9b-a6b9-51e8e330f3eb';

-- 3. Stock actual de Sopa 4 quesos
SELECT 
    'STOCK SOPA 4 QUESOS:' as titulo,
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

-- 4. Verificar trigger existe
SELECT 
    'TRIGGER ACTIVO:' as titulo,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' 
  AND event_object_table = 'orders';

-- 5. Últimas notificaciones
SELECT 
    'NOTIFICACIONES RECIENTES:' as titulo,
    type,
    title,
    message,
    created_at
FROM notifications
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 5;
