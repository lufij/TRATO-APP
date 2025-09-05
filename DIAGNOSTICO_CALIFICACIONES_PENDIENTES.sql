-- 🔍 DIAGNÓSTICO: ¿Por qué no hay calificaciones pendientes?

-- 1️⃣ Ver si hay registros en la tabla ratings
SELECT COUNT(*) as total_ratings FROM ratings;

-- 2️⃣ Ver todas las órdenes existentes
SELECT id, status, buyer_id, seller_id, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 3️⃣ Ver específicamente la orden que estás intentando calificar
-- (Cambia 'ORDEN_ID_AQUI' por el ID real de la orden)
SELECT id, status, buyer_id, seller_id, driver_id, created_at 
FROM orders 
WHERE id = '44d2a792-3f5f-49f3-bf76-b7537d20d58a';

-- 4️⃣ Ver si existe alguna calificación para esa orden
SELECT * FROM ratings 
WHERE order_id = '44d2a792-3f5f-49f3-bf76-b7537d20d58a';

-- 5️⃣ CREAR CALIFICACIÓN PENDIENTE MANUAL para testing
-- (Solo si no existe ninguna)
INSERT INTO ratings (
    order_id, 
    rater_id, 
    rated_id, 
    rating_type, 
    status
) 
SELECT 
    '44d2a792-3f5f-49f3-bf76-b7537d20d58a', -- order_id
    buyer_id, -- rater_id (quien califica)
    seller_id, -- rated_id (quien es calificado)
    'buyer_to_seller', -- rating_type
    'pending' -- status
FROM orders 
WHERE id = '44d2a792-3f5f-49f3-bf76-b7537d20d58a'
AND NOT EXISTS (
    SELECT 1 FROM ratings 
    WHERE order_id = '44d2a792-3f5f-49f3-bf76-b7537d20d58a' 
    AND rating_type = 'buyer_to_seller'
);
