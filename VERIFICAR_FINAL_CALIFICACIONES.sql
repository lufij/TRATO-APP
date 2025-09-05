-- 🔍 VERIFICACIÓN FINAL CORREGIDA: Sistema de calificaciones

-- 1️⃣ VERIFICAR QUE EL TRIGGER SE CREÓ
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pending_ratings';

-- 2️⃣ VER TODAS LAS ÓRDENES RECIENTES (SIN order_number)
SELECT id, status, buyer_id, seller_id, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 3️⃣ VER SI HAY ALGUNA CALIFICACIÓN EN LA TABLA
SELECT COUNT(*) as total_calificaciones FROM ratings;

-- 4️⃣ VER CALIFICACIONES EXISTENTES
SELECT * FROM ratings ORDER BY created_at DESC LIMIT 5;

-- 5️⃣ CREAR CALIFICACIÓN MANUAL PARA TESTING
-- Usar cualquier orden delivered reciente
WITH recent_delivered AS (
    SELECT id, buyer_id, seller_id 
    FROM orders 
    WHERE status = 'delivered'
    ORDER BY created_at DESC 
    LIMIT 1
)
INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
SELECT id, buyer_id, seller_id, 'buyer_to_seller', 'pending'
FROM recent_delivered
ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING
RETURNING 
    id,
    order_id,
    rater_id,
    rated_id,
    rating_type,
    status,
    'CALIFICACIÓN CREADA PARA TESTING' as mensaje;

-- 6️⃣ VERIFICAR CALIFICACIONES DESPUÉS DE CREAR
SELECT 
    r.*,
    'Orden: ' || o.id as info_orden
FROM ratings r
JOIN orders o ON r.order_id = o.id
ORDER BY r.created_at DESC;
