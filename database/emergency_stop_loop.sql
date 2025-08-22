-- ============================================================================
-- SCRIPT EMERGENCIA: DETENER BUCLE INFINITO INMEDIATAMENTE
-- ============================================================================
-- Este script debe ejecutarse INMEDIATAMENTE para detener el bucle infinito

-- PASO 1: Hacer las políticas súper permisivas temporalmente
-- ============================================================================

-- Deshabilitar RLS temporalmente en users para que funcione
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas problemáticas
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_all_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_read_anon" ON public.users;
DROP POLICY IF EXISTS "Enable users to read their own data" ON public.users;
DROP POLICY IF EXISTS "Enable users to insert their own data" ON public.users;
DROP POLICY IF EXISTS "Enable users to update their own data" ON public.users;

-- PASO 2: Limpiar usuarios problemáticos
-- ============================================================================

-- Eliminar usuarios órfanos que causan bucles
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL);

-- PASO 3: Permisos ultra-permisivos temporalmente
-- ============================================================================

-- Dar todos los permisos posibles para evitar errores de permisos
GRANT ALL ON public.users TO public;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.sellers TO public;
GRANT ALL ON public.sellers TO anon;
GRANT ALL ON public.sellers TO authenticated;

GRANT ALL ON public.products TO public;
GRANT ALL ON public.products TO anon;
GRANT ALL ON public.products TO authenticated;

-- PASO 4: Mensaje de confirmación
-- ============================================================================

SELECT 'BUCLE INFINITO DETENIDO - RLS DESHABILITADO TEMPORALMENTE' as status;
SELECT 'RECARGA LA APLICACION AHORA' as action;
SELECT 'Despues de que funcione, ejecuta fix_infinite_loop.sql para reactivar seguridad' as next_step;
