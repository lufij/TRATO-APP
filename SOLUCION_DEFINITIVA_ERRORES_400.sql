-- SOLUCIÓN DEFINITIVA PARA ERRORES 400 EN SELLER DASHBOARD
-- Ejecutar este script en Supabase SQL Editor

-- =============================================
-- 1. CORREGIR PRODUCTOS SIN SELLER_ID
-- =============================================

DO $$
DECLARE
    demo_seller_id UUID;
    productos_sin_seller INTEGER;
BEGIN
    -- Contar productos problemáticos
    SELECT COUNT(*) INTO productos_sin_seller 
    FROM daily_products 
    WHERE seller_id IS NULL;
    
    RAISE NOTICE 'Productos sin seller_id encontrados: %', productos_sin_seller;
    
    IF productos_sin_seller > 0 THEN
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
            
            RAISE NOTICE '✅ % productos actualizados con seller_id: %', 
                         productos_sin_seller, demo_seller_id;
        ELSE
            RAISE NOTICE '❌ No se encontró ningún usuario para asignar como seller';
        END IF;
    ELSE
        RAISE NOTICE '✅ No hay productos sin seller_id';
    END IF;
END $$;

-- =============================================
-- 2. CREAR SELLER_RATINGS_VIEW (VERSIÓN SIMPLE)
-- =============================================

DROP VIEW IF EXISTS seller_ratings_view;

-- Crear vista simple sin dependencia de ratings por ahora
CREATE OR REPLACE VIEW seller_ratings_view AS
SELECT 
    u.id as seller_id,
    u.name as seller_name,
    COALESCE(u.business_name, 'General') as business_name,
    0.0::numeric(3,2) as average_rating,  -- Por defecto 0.0 hasta implementar ratings
    0::integer as total_reviews,          -- Por defecto 0 hasta implementar ratings
    0::integer as positive_reviews        -- Por defecto 0 hasta implementar ratings
FROM users u
WHERE u.role IN ('seller', 'vendedor') OR u.id IN (
    SELECT DISTINCT seller_id FROM daily_products WHERE seller_id IS NOT NULL
    UNION
    SELECT DISTINCT seller_id FROM products WHERE seller_id IS NOT NULL
);

-- Dar permisos a la vista
GRANT SELECT ON seller_ratings_view TO authenticated, anon;

-- =============================================
-- 3. POLÍTICAS RLS MÁS PERMISIVAS
-- =============================================

-- Política SELECT más permisiva para daily_products
DROP POLICY IF EXISTS "daily_products_select_policy" ON daily_products;
CREATE POLICY "daily_products_select_policy" ON daily_products
    FOR SELECT
    USING (
        -- Permitir productos no expirados con seller_id válido
        (expires_at > NOW() AND seller_id IS NOT NULL)
        OR 
        -- Permitir al vendedor ver sus propios productos
        (auth.uid() = seller_id)
        OR
        -- Permitir acceso anónimo básico
        (auth.role() = 'anon' AND expires_at > NOW() AND seller_id IS NOT NULL)
    );

-- Política INSERT para daily_products
DROP POLICY IF EXISTS "daily_products_insert_policy" ON daily_products;
CREATE POLICY "daily_products_insert_policy" ON daily_products
    FOR INSERT
    WITH CHECK (
        auth.uid() = seller_id 
        AND seller_id IS NOT NULL
    );

-- Política UPDATE para daily_products
DROP POLICY IF EXISTS "daily_products_update_policy" ON daily_products;
CREATE POLICY "daily_products_update_policy" ON daily_products
    FOR UPDATE
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

-- Política DELETE para daily_products
DROP POLICY IF EXISTS "daily_products_delete_policy" ON daily_products;
CREATE POLICY "daily_products_delete_policy" ON daily_products
    FOR DELETE
    USING (auth.uid() = seller_id);

-- =============================================
-- 4. VERIFICAR TABLAS PRINCIPALES
-- =============================================

-- Verificar que las tablas principales existen
DO $$
BEGIN
    -- Verificar daily_products
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_products') THEN
        RAISE EXCEPTION 'Tabla daily_products no existe';
    END IF;
    
    -- Verificar users
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Tabla users no existe';
    END IF;
    
    RAISE NOTICE '✅ Todas las tablas principales existen';
END $$;

-- =============================================
-- 5. VERIFICACIÓN FINAL
-- =============================================

SELECT '🔍 VERIFICACIÓN FINAL' as status;

-- Verificar productos sin seller_id
SELECT 
    COUNT(*) as productos_sin_seller,
    'Productos sin seller_id (debe ser 0)' as descripcion
FROM daily_products 
WHERE seller_id IS NULL;

-- Verificar que la vista funciona
SELECT 
    COUNT(*) as sellers_con_rating,
    'Sellers en rating view' as descripcion
FROM seller_ratings_view;

-- Verificar políticas RLS
SELECT 
    COUNT(*) as politicas_daily_products,
    'Políticas RLS para daily_products' as descripcion
FROM pg_policies 
WHERE tablename = 'daily_products';

-- Test de consulta típica del dashboard
SELECT 
    COUNT(*) as productos_disponibles,
    'Productos disponibles para vendedor' as descripcion
FROM daily_products 
WHERE expires_at > NOW() 
  AND seller_id IS NOT NULL;

SELECT '🎉 CORRECCIÓN COMPLETADA - RECARGA LA PÁGINA PARA VER LOS CAMBIOS' as resultado;
