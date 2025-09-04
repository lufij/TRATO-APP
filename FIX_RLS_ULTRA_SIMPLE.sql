-- 🔧 SCRIPT DE REPARACIÓN ULTRA-SIMPLE
-- Ejecutar en Supabase SQL Editor - SIN errores SQL

-- 1. VERIFICAR estructura drivers (SIN ORDER BY)
SELECT 'ESTRUCTURA DRIVERS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND table_schema = 'public';

-- 2. ARREGLAR RLS DRIVERS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Limpiar policies
DROP POLICY IF EXISTS "drivers_online_public_read" ON drivers;
DROP POLICY IF EXISTS "drivers_own_update" ON drivers;
DROP POLICY IF EXISTS "allow_public_drivers_read" ON drivers;
DROP POLICY IF EXISTS "allow_drivers_update_own" ON drivers;

-- Policy básica
CREATE POLICY "allow_public_drivers_read" 
ON drivers FOR SELECT 
TO public
USING (is_online = true);

CREATE POLICY "allow_drivers_update_own" 
ON drivers FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- 3. ARREGLAR RLS USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_read" ON users;
DROP POLICY IF EXISTS "users_public_basic_read" ON users;
DROP POLICY IF EXISTS "allow_users_read_own" ON users;
DROP POLICY IF EXISTS "allow_basic_user_info_read" ON users;

CREATE POLICY "allow_users_read_own" 
ON users FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "allow_basic_user_info_read" 
ON users FOR SELECT 
TO public
USING (true);

-- 4. FUNCIÓN SIMPLE DE CONTEO
CREATE OR REPLACE FUNCTION get_online_drivers_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM drivers WHERE is_online = true);
END;
$$;

-- 5. FUNCIÓN SUPER SIMPLE - Solo IDs
CREATE OR REPLACE FUNCTION get_online_drivers_ids()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT string_agg(id::text, ',') INTO result
  FROM drivers 
  WHERE is_online = true;
  
  RETURN COALESCE(result, '');
END;
$$;

-- 6. FUNCIÓN JSON SIMPLE (sin ORDER BY)
CREATE OR REPLACE FUNCTION get_drivers_basic_info()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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
  );
END;
$$;

-- 7. GRANTS
GRANT EXECUTE ON FUNCTION get_online_drivers_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_online_drivers_ids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_drivers_basic_info() TO anon, authenticated;

-- 8. TESTS BÁSICOS
SELECT 'TEST 1 - Conteo directo:' as test;
SELECT COUNT(*) as drivers_online FROM drivers WHERE is_online = true;

SELECT 'TEST 2 - Función conteo:' as test;
SELECT get_online_drivers_count() as function_result;

SELECT 'TEST 3 - IDs como texto:' as test;
SELECT get_online_drivers_ids() as ids_text;

SELECT 'TEST 4 - JSON básico:' as test;
SELECT get_drivers_basic_info() as json_result;

-- 9. VERIFICAR POLICIES
SELECT 'POLICIES ACTIVAS:' as info;
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('drivers', 'users');

SELECT 'SCRIPT COMPLETADO SIN ERRORES' as status;
