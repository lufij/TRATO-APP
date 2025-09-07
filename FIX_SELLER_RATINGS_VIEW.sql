-- 🔥 SOLUCIÓN: Actualizar seller_ratings_view para mostrar calificaciones reales
-- PROBLEMA: Las calificaciones se guardan en 'ratings' pero no se reflejan en la vista

-- 1️⃣ VERIFICAR LA VISTA ACTUAL
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'seller_ratings_view';

-- 2️⃣ RECREAR LA VISTA CON LÓGICA CORRECTA
CREATE OR REPLACE VIEW seller_ratings_view AS
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

-- 3️⃣ VERIFICAR DATOS DE LA NUEVA VISTA
SELECT * FROM seller_ratings_view LIMIT 5;

-- 4️⃣ VERIFICAR ESPECÍFICAMENTE "Foto Estudio Digital"
SELECT 
    u.business_name,
    u.name,
    srv.average_rating,
    srv.total_reviews
FROM seller_ratings_view srv
JOIN users u ON srv.seller_id = u.id
WHERE u.business_name ILIKE '%Foto Estudio Digital%';

-- 5️⃣ VER TODAS LAS CALIFICACIONES COMPLETADAS
SELECT 
    r.rating,
    r.comment,
    r.rating_type,
    r.completed_at,
    rater.name as rater_name,
    rated.business_name as business_name
FROM ratings r
JOIN users rater ON r.rater_id = rater.id
JOIN users rated ON r.rated_id = rated.id
WHERE r.status = 'completed'
AND r.rating_type = 'buyer_to_seller'
ORDER BY r.completed_at DESC
LIMIT 10;
