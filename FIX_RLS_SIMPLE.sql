-- 🔧 SCRIPT DE REPARACIÓN CRÍTICA - VERSIÓN SIMPLIFICADA
-- Ejecutar en Supabase SQL Editor para arreglar errores 400

-- 1. Verificar estado actual de las tablas
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('drivers', 'users', 'daily_products');

-- 2. ARREGLAR TABLA DRIVERS - Versión simplificada
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes
DROP POLICY IF EXISTS "drivers_online_public_read" ON drivers;
DROP POLICY IF EXISTS "drivers_own_update" ON drivers;

-- Policy simple para consulta pública de drivers online
CREATE POLICY "allow_public_drivers_read" 
ON drivers FOR SELECT 
TO public
USING (is_online = true AND is_active = true);

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

-- 4. ARREGLAR TABLA DAILY_PRODUCTS
ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes
DROP POLICY IF EXISTS "daily_products_public_read" ON daily_products;

-- Policy simple para productos activos
CREATE POLICY "allow_active_daily_products_read" 
ON daily_products FOR SELECT 
TO public
USING (is_active = true);

-- 5. FUNCIÓN SEGURA PARA CONTAR DRIVERS ONLINE - Versión simplificada
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
  WHERE is_online = true 
  AND is_active = true;
  
  RETURN COALESCE(driver_count, 0);
END;
$$;

-- 6. FUNCIÓN PARA OBTENER INFORMACIÓN BÁSICA DE DRIVERS
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
      'id', d.id,
      'name', u.name,
      'is_online', d.is_online,
      'is_active', d.is_active,
      'updated_at', d.updated_at
    )
  ) INTO result
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.is_online = true 
  AND d.is_active = true
  ORDER BY d.updated_at DESC
  LIMIT 10;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 7. GRANTS para funciones públicas
GRANT EXECUTE ON FUNCTION get_online_drivers_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_drivers_info() TO anon, authenticated;

-- 8. VERIFICACIÓN FINAL
SELECT 'VERIFICACIÓN FINAL:' as status;

-- Test básico de conteo
SELECT 
  'Drivers online (consulta directa):' as metric,
  COUNT(*) as value
FROM drivers 
WHERE is_online = true AND is_active = true;

-- Test de función
SELECT 
  'Drivers online (función):' as metric,
  get_online_drivers_count() as value;

-- Test de función de información
SELECT 
  'Información de drivers:' as metric,
  get_available_drivers_info() as value;

-- 9. VERIFICAR POLICIES ACTIVAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('drivers', 'users', 'daily_products')
ORDER BY tablename, policyname;
