-- 🔍 VERIFICAR CALIFICACIONES REALES DESPUÉS DE IMPLEMENTAR

-- 1️⃣ Ver calificaciones por vendedor
SELECT 
    seller_id,
    business_name,
    average_rating,
    total_reviews,
    five_stars,
    four_stars,
    three_stars,
    two_stars,
    one_stars
FROM seller_ratings_view 
ORDER BY average_rating DESC, total_reviews DESC;

-- 2️⃣ Ver calificaciones completadas específicas
SELECT 
    r.rated_id as seller_id,
    s.business_name,
    r.rating,
    r.comment,
    r.completed_at,
    u.name as reviewer_name
FROM ratings r
JOIN sellers s ON r.rated_id = s.id
JOIN users u ON r.rater_id = u.id
WHERE r.rating_type = 'buyer_to_seller'
AND r.status = 'completed'
ORDER BY r.completed_at DESC;

-- 3️⃣ Estadísticas generales
SELECT 
    COUNT(*) as total_completed_ratings,
    ROUND(AVG(rating::numeric), 2) as overall_average,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars_total,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars_total,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars_total,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars_total,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_stars_total
FROM ratings 
WHERE rating_type = 'buyer_to_seller' 
AND status = 'completed' 
AND rating IS NOT NULL;
