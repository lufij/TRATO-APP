-- =====================================================
-- DIAGNÓSTICO COMPLETO: PROBLEMA DE REGISTRO DE USUARIOS
-- =====================================================
-- Problema reportado: Usuarios no pueden crear cuentas
-- Error: "perfil de usuario faltante", "usuario autenticado pero sin perfil"
-- Advertencia: "políticas RLS no se pueden verificar"
-- ACTUALIZADO: Versión completa del diagnóstico

-- 🔍 PASO 1: VERIFICAR ESTRUCTURA DE TABLA USERS
DO $$
BEGIN
    RAISE NOTICE '🔍 === DIAGNÓSTICO COMPLETO DE REGISTRO DE USUARIOS ===';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PASO 1: Verificando estructura de tabla users...';
END $$;
    RAISE NOTICE '';
END $$;

-- Contar usuarios en auth.users
SELECT 
    'auth.users' as tabla,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as usuarios_ultima_semana
FROM auth.users;

-- Contar usuarios en public.users
SELECT 
    'public.users' as tabla,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as usuarios_ultima_semana
FROM public.users;

-- 2. ENCONTRAR USUARIOS HUÉRFANOS (están en auth pero no en public)
DO $$
BEGIN
    RAISE NOTICE '🔍 USUARIOS HUÉRFANOS DETECTADOS:';
END $$;

SELECT 
    'USUARIOS HUÉRFANOS' as status,
    au.id,
    au.email,
    au.created_at as auth_created_at,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as suggested_name,
    COALESCE(au.raw_user_meta_data->>'role', 'comprador') as suggested_role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC
LIMIT 10;

-- 3. VERIFICAR POLÍTICAS RLS EN public.users
DO $$
BEGIN
    RAISE NOTICE '🔒 VERIFICANDO POLÍTICAS RLS EN public.users:';
END $$;

-- Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    relforcerowsecurity as force_rls
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename = 'users' AND t.schemaname = 'public';

-- Listar todas las políticas para la tabla users
SELECT 
    polname as policy_name,
    polcmd as command,
    polroles as roles,
    polqual as using_expression,
    polwithcheck as with_check_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'users';

-- 4. VERIFICAR PERMISOS EN LA TABLA users
DO $$
BEGIN
    RAISE NOTICE '👥 VERIFICANDO PERMISOS EN public.users:';
END $$;

-- Verificar permisos de inserción
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND privilege_type = 'INSERT';

-- 5. VERIFICAR FUNCIONES Y TRIGGERS RELACIONADOS
DO $$
BEGIN
    RAISE NOTICE '⚙️ VERIFICANDO TRIGGERS Y FUNCIONES:';
END $$;

-- Verificar triggers en auth.users
SELECT 
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema IN ('auth', 'public');

-- 6. VERIFICAR CONFIGURACIÓN DE SUPABASE AUTH
DO $$
BEGIN
    RAISE NOTICE '🔧 VERIFICANDO CONFIGURACIÓN AUTH:';
END $$;

-- Verificar configuración de Supabase
SELECT 
    'auth.users confirmación' as check_type,
    COUNT(*) as total,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed
FROM auth.users;

-- 7. RESUMEN DEL PROBLEMA
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    SELECT COUNT(*) INTO orphaned_count 
    FROM auth.users au 
    LEFT JOIN public.users pu ON au.id = pu.id 
    WHERE pu.id IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN DEL PROBLEMA:';
    RAISE NOTICE '========================';
    RAISE NOTICE 'Usuarios en auth.users: %', auth_count;
    RAISE NOTICE 'Usuarios en public.users: %', public_count;
    RAISE NOTICE 'Usuarios huérfanos: %', orphaned_count;
    RAISE NOTICE '';
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE '🚨 PROBLEMA CONFIRMADO: % usuarios huérfanos encontrados', orphaned_count;
        RAISE NOTICE 'Los usuarios pueden autenticarse pero no tienen perfil en public.users';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 EJECUTA AHORA: SOLUCION_USUARIOS_URGENTE.sql';
    ELSE
        RAISE NOTICE '✅ No se encontraron usuarios huérfanos';
    END IF;
END $$;

-- 🔒 PASO 2: VERIFICAR POLÍTICAS RLS EN DETALLE
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 PASO 2: Verificando políticas RLS...';
END $$;

-- Verificar si RLS está habilitado en tabla users
SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO en tabla users'
        ELSE '❌ ERROR CRÍTICO: RLS DESHABILITADO en tabla users'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- Listar todas las políticas RLS de users
SELECT 
    'Política RLS: ' || policyname as politica,
    'Comando: ' || cmd as comando,
    'Condición: ' || COALESCE(qual, 'ninguna') as condicion
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

-- 🔐 PASO 3: VERIFICAR PERMISOS Y FUNCIONES AUTH
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 PASO 3: Verificando funciones de autenticación...';
END $$;

-- Verificar que la función auth.uid() existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'auth' AND p.proname = 'uid'
        )
        THEN '✅ Función auth.uid() EXISTE'
        ELSE '❌ ERROR: Función auth.uid() NO EXISTE'
    END as auth_uid_status;

-- 📊 PASO 4: ESTADÍSTICAS DE USUARIOS
DO $$
DECLARE
    total_users INTEGER;
    compradores INTEGER;
    vendedores INTEGER;
    repartidores INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 PASO 4: Estadísticas de usuarios en public.users...';
    
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO compradores FROM users WHERE role = 'comprador';
    SELECT COUNT(*) INTO vendedores FROM users WHERE role = 'vendedor';
    SELECT COUNT(*) INTO repartidores FROM users WHERE role = 'repartidor';
    
    RAISE NOTICE 'Total usuarios: %', total_users;
    RAISE NOTICE 'Compradores: %', compradores;
    RAISE NOTICE 'Vendedores: %', vendedores;
    RAISE NOTICE 'Repartidores: %', repartidores;
END $$;

-- 🚨 PASO 5: DIAGNÓSTICO FINAL Y RECOMENDACIONES
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚨 === DIAGNÓSTICO FINAL ===';
    RAISE NOTICE '';
    RAISE NOTICE 'PROBLEMAS COMUNES Y SOLUCIONES:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Si hay usuarios huérfanos:';
    RAISE NOTICE '   → Ejecutar: SOLUCION_USUARIOS_URGENTE.sql';
    RAISE NOTICE '';
    RAISE NOTICE '2. Si RLS está mal configurado:';
    RAISE NOTICE '   → Las políticas INSERT/UPDATE deben usar auth.uid() = id';
    RAISE NOTICE '';
    RAISE NOTICE '3. Si auth.uid() no funciona:';
    RAISE NOTICE '   → Verificar configuración de Supabase Auth';
    RAISE NOTICE '';
    RAISE NOTICE '4. Si persiste el problema:';
    RAISE NOTICE '   → Revisar logs de aplicación React';
    RAISE NOTICE '   → Verificar CORS y configuración de URLs';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Diagnóstico completado. Revisa todos los resultados.';
END $$;

SELECT 'DIAGNÓSTICO COMPLETADO - ' || NOW()::text as timestamp;
