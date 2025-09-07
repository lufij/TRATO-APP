-- 🔥 SOLUCIÓN DEFINITIVA: Actualizar seller_ratings_view
-- EJECUTA ESTE SQL EN SUPABASE SQL EDITOR

-- 1️⃣ ELIMINAR LA VISTA EXISTENTE PRIMERO
DROP VIEW IF EXISTS seller_ratings_view;

-- 2️⃣ RECREAR LA VISTA seller_ratings_view DESDE CERO
CREATE VIEW seller_ratings_view AS
SELECT 
    rated_id as seller_id,
    ROUND(AVG(rating::numeric), 2) as average_rating,
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count,
    MAX(completed_at) as last_rating_date
FROM ratings
WHERE status = 'completed' 
AND rating_type IN ('buyer_to_seller')
GROUP BY rated_id;

-- 3️⃣ VERIFICAR LA ESTRUCTURA DE LA TABLA USERS PRIMERO
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

-- 4️⃣ VER TODAS LAS CALIFICACIONES COMPLETADAS
SELECT 
    r.rating,
    r.comment,
    r.completed_at,
    r.rated_id
FROM ratings r
WHERE r.status = 'completed'
AND r.rating_type = 'buyer_to_seller'
ORDER BY r.completed_at DESC;

-- 5️⃣ VERIFICAR TODAS LAS VISTAS DE CALIFICACIONES
SELECT * FROM seller_ratings_view ORDER BY total_reviews DESC;

-- 6️⃣ MENSAJE DE ÉXITO
SELECT '🎉 Vista seller_ratings_view creada exitosamente' as resultado;
