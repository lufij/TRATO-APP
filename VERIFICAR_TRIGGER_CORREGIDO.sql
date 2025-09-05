-- 🔍 VERIFICACIÓN CORREGIDA: ¿Qué pasó con el trigger y la calificación?

-- 1️⃣ VERIFICAR QUE EL TRIGGER SE CREÓ
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pending_ratings';

-- 2️⃣ VERIFICAR SI LA ORDEN EXISTE (CORREGIDO PARA UUID)
SELECT id, status, buyer_id, seller_id, created_at 
FROM orders 
WHERE id::text LIKE '44d2a792%' 
   OR order_number LIKE '%44d2a792%'
ORDER BY created_at DESC;

-- 3️⃣ VER TODAS LAS ÓRDENES RECIENTES
SELECT id, status, buyer_id, seller_id, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 4️⃣ VER SI HAY ALGUNA CALIFICACIÓN EN LA TABLA
SELECT COUNT(*) as total_calificaciones FROM ratings;

-- 5️⃣ VER CALIFICACIONES EXISTENTES
SELECT * FROM ratings ORDER BY created_at DESC LIMIT 5;

-- 6️⃣ CREAR CALIFICACIÓN PARA LA ORDEN MÁS RECIENTE DELIVERED
INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
SELECT 
    o.id, 
    o.buyer_id, 
    o.seller_id, 
    'buyer_to_seller', 
    'pending'
FROM orders o
WHERE o.status = 'delivered'
ORDER BY o.created_at DESC 
LIMIT 1
ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING
RETURNING *;
