-- 🔧 AGREGAR FUNCIÓN SQL PARA CALCULAR CALIFICACIONES REALES

-- 1️⃣ FUNCIÓN PARA OBTENER CALIFICACIÓN PROMEDIO DE UN VENDEDOR
CREATE OR REPLACE FUNCTION get_seller_rating(seller_uuid UUID)
RETURNS TABLE (
    average_rating DECIMAL(3,2),
    total_reviews INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ROUND(AVG(r.rating::numeric), 2), 0.00) as average_rating,
        COALESCE(COUNT(r.rating)::integer, 0) as total_reviews
    FROM ratings r
    WHERE r.rated_id = seller_uuid 
    AND r.rating_type = 'buyer_to_seller' 
    AND r.status = 'completed'
    AND r.rating IS NOT NULL;
END;
$$;

-- 2️⃣ VERIFICAR LA FUNCIÓN
SELECT * FROM get_seller_rating('561711e7-a66e-4166-93f0-3038666c4096');

-- 3️⃣ VISTA PARA ESTADÍSTICAS DE VENDEDORES 
CREATE OR REPLACE VIEW seller_ratings_view AS
SELECT 
    s.id as seller_id,
    s.business_name,
    COALESCE(ROUND(AVG(r.rating::numeric), 2), 0.00) as average_rating,
    COALESCE(COUNT(r.rating), 0) as total_reviews,
    -- Calificaciones por estrella
    COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_stars,
    COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_stars,
    COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_stars,
    COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_stars,
    COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_stars
FROM sellers s
LEFT JOIN ratings r ON s.id = r.rated_id 
    AND r.rating_type = 'buyer_to_seller' 
    AND r.status = 'completed'
    AND r.rating IS NOT NULL
GROUP BY s.id, s.business_name;

-- 4️⃣ VERIFICAR LA VISTA
SELECT * FROM seller_ratings_view 
WHERE seller_id = '561711e7-a66e-4166-93f0-3038666c4096';

-- 5️⃣ VER TODOS LOS VENDEDORES CON SUS CALIFICACIONES REALES
SELECT 
    seller_id,
    business_name,
    average_rating,
    total_reviews
FROM seller_ratings_view 
ORDER BY average_rating DESC, total_reviews DESC;
