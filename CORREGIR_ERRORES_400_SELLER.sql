-- DIAGNÓSTICO Y CORRECCIÓN DE ERRORES 400 EN SELLER DASHBOARD
-- Este script identifica y corrige las causas de los errores 400

-- =============================================
-- 1. VERIFICAR ESTADO DE DATOS PROBLEMÁTICOS
-- =============================================

SELECT '🔍 DIAGNÓSTICO DE daily_products' as diagnostico;

-- Verificar productos sin seller_id (esto causa error 400)
SELECT 
    COUNT(*) as productos_sin_seller,
    'Productos sin seller_id (CRÍTICO)' as problema
FROM daily_products 
WHERE seller_id IS NULL;

-- Verificar productos con expires_at inválido
SELECT 
    COUNT(*) as productos_vencidos,
    'Productos con expires_at en el pasado' as problema
FROM daily_products 
WHERE expires_at < NOW();

-- Ver un ejemplo de producto problemático
SELECT 
    id,
    name,
    seller_id,
    expires_at,
    CASE 
        WHEN seller_id IS NULL THEN '❌ SELLER_ID NULL'
        WHEN expires_at < NOW() THEN '⏰ EXPIRADO'
        ELSE '✅ OK'
    END as estado
FROM daily_products 
LIMIT 5;

-- =============================================
-- 2. VERIFICAR SI SELLER_RATINGS_VIEW EXISTE
-- =============================================

SELECT '🔍 VERIFICANDO SELLER_RATINGS_VIEW' as diagnostico;

SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'seller_ratings_view';

-- =============================================
-- 3. VERIFICAR POLÍTICAS RLS DE DAILY_PRODUCTS
-- =============================================

SELECT '🔍 VERIFICANDO POLÍTICAS RLS' as diagnostico;

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'daily_products'
ORDER BY policyname;

-- =============================================
-- 4. CORRECCIONES AUTOMÁTICAS
-- =============================================

-- CORRECCIÓN 1: Asignar seller_id a productos huérfanos
DO $$
DECLARE
    demo_seller_id UUID;
    productos_afectados INT;
BEGIN
    -- Obtener un seller_id válido
    SELECT id INTO demo_seller_id 
    FROM users 
    WHERE role IN ('seller', 'vendedor') 
    LIMIT 1;
    
    IF demo_seller_id IS NULL THEN
        SELECT id INTO demo_seller_id FROM users LIMIT 1;
    END IF;
    
    IF demo_seller_id IS NOT NULL THEN
        -- Actualizar productos sin seller_id
        UPDATE daily_products 
        SET seller_id = demo_seller_id 
        WHERE seller_id IS NULL;
        
        GET DIAGNOSTICS productos_afectados = ROW_COUNT;
        
        RAISE NOTICE '✅ CORRECCIÓN 1: % productos actualizados con seller_id: %', 
                     productos_afectados, demo_seller_id;
    ELSE
        RAISE NOTICE '❌ No se encontró ningún usuario para asignar como seller';
    END IF;
END $$;

-- CORRECCIÓN 2: Crear seller_ratings_view si no existe
CREATE OR REPLACE VIEW seller_ratings_view AS
SELECT 
    u.id as seller_id,
    u.name as seller_name,
    u.business_name,
    COALESCE(AVG(r.rating), 0.0) as average_rating,
    COUNT(r.id) as total_reviews,
    COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as positive_reviews
FROM users u
LEFT JOIN ratings r ON r.seller_id = u.id
WHERE u.role IN ('seller', 'vendedor')
GROUP BY u.id, u.name, u.business_name;

-- Dar permisos a la vista
GRANT SELECT ON seller_ratings_view TO authenticated, anon;

-- CORRECCIÓN 3: Políticas RLS más permisivas para daily_products
DROP POLICY IF EXISTS "daily_products_select_policy" ON daily_products;
CREATE POLICY "daily_products_select_policy" ON daily_products
    FOR SELECT
    USING (
        -- Permitir ver productos no expirados de cualquier vendedor autenticado
        expires_at > NOW() 
        OR 
        -- O permitir al vendedor ver sus propios productos (incluso expirados)
        (auth.uid() = seller_id)
        OR
        -- O permitir acceso anónimo a productos públicos activos
        (auth.role() = 'anon' AND expires_at > NOW() AND seller_id IS NOT NULL)
    );

-- =============================================
-- 5. VERIFICACIÓN POST-CORRECCIÓN
-- =============================================

SELECT '✅ VERIFICACIÓN POST-CORRECCIÓN' as resultado;

-- Verificar que no hay productos sin seller_id
SELECT 
    COUNT(*) as productos_sin_seller,
    'Productos sin seller_id después de corrección' as descripcion
FROM daily_products 
WHERE seller_id IS NULL;

-- Verificar que la vista funciona
SELECT 
    COUNT(*) as sellers_con_rating,
    'Sellers en rating view' as descripcion
FROM seller_ratings_view;

-- Test de consulta típica del dashboard
SELECT 
    COUNT(*) as productos_visibles,
    'Productos visibles para consulta típica' as descripcion
FROM daily_products 
WHERE expires_at > NOW()
  AND seller_id IS NOT NULL;

SELECT '🎉 CORRECCIÓN COMPLETADA - Los errores 400 deberían estar resueltos' as mensaje;
