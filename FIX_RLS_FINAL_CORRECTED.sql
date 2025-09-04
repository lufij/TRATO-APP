-- 🔧 SCRIPT DE REPARACIÓN CRÍTICA - VERSIÓN CORREGIDA
-- Ejecutar en Supabase SQL Editor para arreglar errores 400

-- 1. Verificar estructura de tabla drivers
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ARREGLAR TABLA DRIVERS - Solo usando columnas que existen
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes
DROP POLICY IF EXISTS "drivers_online_public_read" ON drivers;
DROP POLICY IF EXISTS "drivers_own_update" ON drivers;
DROP POLICY IF EXISTS "allow_public_drivers_read" ON drivers;
DROP POLICY IF EXISTS "allow_drivers_update_own" ON drivers;

-- Policy simple para consulta pública de drivers online (solo is_online)
CREATE POLICY "allow_public_drivers_read" 
ON drivers FOR SELECT 
TO public
USING (is_online = true);

-- Policy para que drivers autenticados puedan actualizar su estado
CREATE POLICY "allow_drivers_update_own" 
ON drivers FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- 3. ARREGLAR TABLA USERS - Versión simplificada
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes
DROP POLICY IF EXISTS "users_own_read" ON users;
DROP POLICY IF EXISTS "users_public_basic_read" ON users;
DROP POLICY IF EXISTS "allow_users_read_own" ON users;
DROP POLICY IF EXISTS "allow_basic_user_info_read" ON users;

-- Policy para que usuarios vean su propia información
CREATE POLICY "allow_users_read_own" 
ON users FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy para permitir lectura básica para joins (nombre, role)
CREATE POLICY "allow_basic_user_info_read" 
ON users FOR SELECT 
TO public
USING (true);

-- 4. ARREGLAR TABLA DAILY_PRODUCTS (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_products') THEN
    ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "daily_products_public_read" ON daily_products;
    DROP POLICY IF EXISTS "allow_active_daily_products_read" ON daily_products;
    
    -- Verificar si tiene columna is_active
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'is_active') THEN
      CREATE POLICY "allow_active_daily_products_read" 
      ON daily_products FOR SELECT 
      TO public
      USING (is_active = true);
    ELSE
      CREATE POLICY "allow_daily_products_read" 
      ON daily_products FOR SELECT 
      TO public
      USING (true);
    END IF;
  END IF;
END $$;

-- 5. FUNCIÓN SEGURA PARA CONTAR DRIVERS ONLINE - Solo is_online
CREATE OR REPLACE FUNCTION get_online_drivers_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO driver_count
  FROM drivers 
  WHERE is_online = true;
  
  RETURN COALESCE(driver_count, 0);
END;
$$;

-- 6. FUNCIÓN PARA OBTENER INFORMACIÓN BÁSICA DE DRIVERS - CORREGIDA
CREATE OR REPLACE FUNCTION get_available_drivers_info()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', driver_info.id,
      'name', driver_info.name,
      'is_online', driver_info.is_online,
      'updated_at', driver_info.updated_at
    )
  ) INTO result
  FROM (
    SELECT 
      d.id,
      u.name,
      d.is_online,
      d.updated_at
    FROM drivers d
    JOIN users u ON u.id = d.id
    WHERE d.is_online = true
    ORDER BY d.updated_at DESC
    LIMIT 10
  ) driver_info;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 7. FUNCIÓN PARA VERIFICAR ESTRUCTURA DE DRIVERS
CREATE OR REPLACE FUNCTION get_drivers_structure()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'column_name', col_info.column_name,
      'data_type', col_info.data_type,
      'is_nullable', col_info.is_nullable
    )
  ) INTO result
  FROM (
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'drivers' 
    AND table_schema = 'public'
    ORDER BY ordinal_position
  ) col_info;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 8. FUNCIÓN SIMPLE PARA OBTENER DRIVERS (alternativa más simple)
CREATE OR REPLACE FUNCTION get_simple_drivers_list()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', d.id,
          'is_online', d.is_online
        )
      ), '[]'::json
    )
    FROM drivers d
    WHERE d.is_online = true
    LIMIT 20
  );
END;
$$;

-- 9. GRANTS para funciones públicas
GRANT EXECUTE ON FUNCTION get_online_drivers_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_drivers_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_drivers_structure() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_simple_drivers_list() TO anon, authenticated;

-- 10. VERIFICACIÓN FINAL
SELECT 'VERIFICACIÓN FINAL:' as status;

-- Mostrar estructura de drivers
SELECT 'Estructura de drivers:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'drivers' ORDER BY ordinal_position;

-- Test básico de conteo (solo is_online)
SELECT 
  'Drivers online (consulta directa):' as metric,
  COUNT(*) as value
FROM drivers 
WHERE is_online = true;

-- Test de función de conteo
SELECT 
  'Drivers online (función):' as metric,
  get_online_drivers_count() as value;

-- Test de función simple
SELECT 
  'Lista simple de drivers:' as metric,
  get_simple_drivers_list() as value;

-- Test de función completa (puede fallar si hay problemas con users)
SELECT 
  'Información completa de drivers:' as metric,
  get_available_drivers_info() as value;

-- Test de estructura
SELECT 
  'Estructura completa:' as metric,
  get_drivers_structure() as value;

-- 11. VERIFICAR POLICIES ACTIVAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('drivers', 'users', 'daily_products')
ORDER BY tablename, policyname;

-- 12. TEST DE CONECTIVIDAD BÁSICA
SELECT 'Test de conectividad completado' as final_status;
