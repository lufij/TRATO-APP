-- 🔍 VERIFICACIÓN: ¿Qué pasó con el trigger y la calificación?

-- 1️⃣ VERIFICAR QUE EL TRIGGER SE CREÓ
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pending_ratings';

-- 2️⃣ VERIFICAR SI LA ORDEN EXISTE (PUEDE SER DIFERENTE ID)
SELECT id, status, buyer_id, seller_id, created_at 
FROM orders 
WHERE id LIKE '44d2a792%' 
   OR order_number LIKE '%44d2a792%'
ORDER BY created_at DESC;

-- 3️⃣ VER TODAS LAS ÓRDENES RECIENTES
SELECT id, status, buyer_id, seller_id, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 4️⃣ VER SI HAY ALGUNA CALIFICACIÓN EN LA TABLA
SELECT COUNT(*) as total_calificaciones FROM ratings;
SELECT * FROM ratings LIMIT 5;

-- 5️⃣ CREAR CALIFICACIÓN PARA LA ORDEN MÁS RECIENTE
WITH latest_order AS (
    SELECT id, buyer_id, seller_id 
    FROM orders 
    WHERE status = 'delivered'
    ORDER BY created_at DESC 
    LIMIT 1
)
INSERT INTO ratings (order_id, rater_id, rated_id, rating_type, status)
SELECT id, buyer_id, seller_id, 'buyer_to_seller', 'pending'
FROM latest_order
ON CONFLICT (order_id, rater_id, rated_id, rating_type) DO NOTHING
RETURNING *;
