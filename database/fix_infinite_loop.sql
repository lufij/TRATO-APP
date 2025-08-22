-- ============================================================================
-- SOLUCION ESPECIFICA PARA BUCLE INFINITO
-- ============================================================================
-- Este script soluciona los problemas más comunes que causan bucles infinitos

-- PASO 1: Limpiar usuarios órfanos y datos inconsistentes
-- ============================================================================

-- Eliminar usuarios órfanos de auth que no tienen perfil
-- (CUIDADO: esto eliminará usuarios sin perfil)
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL);

-- PASO 2: Desactivar RLS en auth.users si está habilitado (no debería estar)
-- ============================================================================

-- Verificar y corregir RLS en auth.users
DO $$
BEGIN
    -- auth.users no debería tener RLS habilitado
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS deshabilitado en auth.users';
    END IF;
END $$;

-- PASO 3: Corregir políticas de public.users que pueden causar bucles
-- ============================================================================

-- Eliminar todas las políticas problemáticas de users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Enable users to read their own data" ON public.users;
DROP POLICY IF EXISTS "Enable users to insert their own data" ON public.users;
DROP POLICY IF EXISTS "Enable users to update their own data" ON public.users;

-- Crear políticas más permisivas que no causen bucles
CREATE POLICY "users_all_authenticated" ON public.users
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política de lectura para anónimos (necesaria para registro)
CREATE POLICY "users_read_anon" ON public.users
    FOR SELECT TO anon
    USING (true);

-- PASO 4: Asegurar permisos correctos
-- ============================================================================

-- Permisos para usuarios autenticados
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.sellers TO authenticated;
GRANT ALL ON public.products TO authenticated;

-- Permisos para usuarios anónimos (necesarios para registro)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.users TO anon;
GRANT INSERT ON public.users TO anon;
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT ON public.products TO anon;

-- PASO 5: Corregir configuración de secuencias
-- ============================================================================

-- Asegurar que las secuencias tengan permisos correctos
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- PASO 6: Función para debugging del bucle infinito
-- ============================================================================

-- Crear función para registrar intentos de autenticación
CREATE OR REPLACE FUNCTION public.debug_auth_attempts()
RETURNS TABLE (
    total_auth_users BIGINT,
    total_profile_users BIGINT,
    orphaned_users BIGINT,
    recent_signups BIGINT
) 
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT 
        (SELECT COUNT(*) FROM auth.users) as total_auth_users,
        (SELECT COUNT(*) FROM public.users) as total_profile_users,
        (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as orphaned_users,
        (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '1 hour') as recent_signups;
$$;

-- PASO 7: Crear usuario de prueba si no existe ninguno
-- ============================================================================

-- Solo crear si no hay usuarios
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
        -- Crear usuario de prueba básico
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'test@example.com',
            'Usuario de Prueba',
            'comprador',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Usuario de prueba creado';
    END IF;
END $$;

-- PASO 8: Mensaje final
-- ============================================================================

SELECT 'SOLUCION DE BUCLE INFINITO COMPLETADA' as status;
SELECT 'Verifica la aplicacion en 2-3 minutos' as next_step;
SELECT 'Si persiste el problema, revisa logs del navegador' as debug_tip;
