-- 🔧 SCRIPT DE REPARACIÓN CRÍTICA - PERMISOS RLS
-- Ejecutar en Supabase SQL Editor para arreglar errores 400

-- 1. Verificar estado actual de las tablas
SELECT 
  tablename,
  rowsecurity,
  hasindexes
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('drivers', 'users', 'daily_products');

-- 2. ARREGLAR TABLA DRIVERS - Permitir consultas públicas para verificar disponibilidad
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Policy para permitir consulta de drivers online (público)
DROP POLICY IF EXISTS "drivers_online_public_read" ON drivers;
CREATE POLICY "drivers_online_public_read" 
ON drivers FOR SELECT 
USING (is_online = true AND is_active = true);

-- Policy para que drivers puedan actualizar su estado
DROP POLICY IF EXISTS "drivers_own_update" ON drivers;
CREATE POLICY "drivers_own_update" 
ON drivers FOR UPDATE 
USING (auth.uid() = id::uuid)
WITH CHECK (auth.uid() = id::uuid);

-- 3. ARREGLAR TABLA USERS - Verificación de roles
DROP POLICY IF EXISTS "users_own_read" ON users;
CREATE POLICY "users_own_read" 
ON users FOR SELECT 
USING (auth.uid() = id::uuid);

-- Policy para permitir consulta básica de información pública
DROP POLICY IF EXISTS "users_public_basic_read" ON users;
CREATE POLICY "users_public_basic_read" 
ON users FOR SELECT 
USING (true)  -- Permitir lectura básica, filtrar en aplicación
WITH CHECK (false);

-- 4. ARREGLAR TABLA DAILY_PRODUCTS - Para verificar stock
DROP POLICY IF EXISTS "daily_products_public_read" ON daily_products;
CREATE POLICY "daily_products_public_read" 
ON daily_products FOR SELECT 
USING (is_active = true);

-- 5. FUNCIÓN SEGURA PARA CONTAR DRIVERS ONLINE
CREATE OR REPLACE FUNCTION get_online_drivers_count()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM drivers 
  WHERE is_online = true 
  AND is_active = true;
$$;

-- 6. FUNCIÓN SEGURA PARA OBTENER DRIVERS DISPONIBLES
CREATE OR REPLACE FUNCTION get_available_drivers()
RETURNS TABLE(
  id uuid,
  name TEXT,
  is_online BOOLEAN,
  is_active BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    u.name,
    d.is_online,
    d.is_active,
    d.updated_at
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.is_online = true 
  AND d.is_active = true
  ORDER BY d.updated_at DESC;
$$;

-- 7. GRANTS para funciones públicas
GRANT EXECUTE ON FUNCTION get_online_drivers_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_drivers() TO anon, authenticated;

-- 8. VERIFICACIÓN FINAL
SELECT 'VERIFICACIÓN FINAL:' as status;

SELECT 
  'Drivers online:' as metric,
  COUNT(*) as value
FROM drivers 
WHERE is_online = true AND is_active = true;

SELECT 
  'Función count:' as metric,
  get_online_drivers_count() as value;

-- 9. TEST DE FUNCIÓN DISPONIBLE
SELECT 'DRIVERS DISPONIBLES:' as status;
SELECT * FROM get_available_drivers() LIMIT 3;
