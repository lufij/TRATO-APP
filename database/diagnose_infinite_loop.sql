-- ============================================================================
-- DIAGNÓSTICO AVANZADO PARA BUCLE INFINITO
-- ============================================================================
-- Este script verifica específicamente los problemas que causan bucles infinitos

-- Verificar configuración de autenticación
SELECT 'VERIFICANDO CONFIGURACION AUTH:' as check_type;

-- Verificar si auth.users tiene datos
SELECT 
    'auth.users' as tabla,
    COUNT(*) as total_usuarios
FROM auth.users;

-- Verificar si public.users tiene datos
SELECT 
    'public.users' as tabla,
    COUNT(*) as total_usuarios
FROM public.users;

-- Verificar si hay usuarios órfanos (en auth pero no en public.users)
SELECT 'VERIFICANDO USUARIOS ORFANOS:' as check_type;

SELECT 
    COUNT(*) as usuarios_orfanos,
    CASE 
        WHEN COUNT(*) > 0 THEN 'HAY USUARIOS ORFANOS - ESTO CAUSA BUCLE INFINITO'
        ELSE 'NO HAY USUARIOS ORFANOS'
    END as problema
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Verificar políticas problemáticas
SELECT 'VERIFICANDO POLITICAS:' as check_type;

-- Contar políticas en users
SELECT 
    'public.users' as tabla,
    COUNT(*) as num_politicas
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Verificar que las políticas permitan inserción
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'users'
ORDER BY policyname;

-- Verificar permisos en auth
SELECT 'VERIFICANDO PERMISOS AUTH:' as check_type;

-- Verificar si RLS está habilitado en auth.users (no debería estar)
SELECT 
    'auth.users' as tabla,
    relrowsecurity as rls_habilitado,
    CASE 
        WHEN relrowsecurity THEN 'PROBLEMA: RLS habilitado en auth.users'
        ELSE 'OK: RLS deshabilitado en auth.users'
    END as estado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- Verificar configuración de email confirmation
SELECT 'VERIFICANDO CONFIG SUPABASE:' as check_type;

-- Esta query puede fallar si no tienes acceso, pero intentémoslo
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.config 
            WHERE parameter = 'MAILER_ENABLE_SIGNUP_CONFIRMATION' 
            AND value = 'false'
        ) 
        THEN 'Email confirmation deshabilitado (correcto)'
        ELSE 'Revisar configuración de email confirmation'
    END as email_config;

-- Mostrar usuarios existentes para debug
SELECT 'USUARIOS EXISTENTES:' as check_type;

SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    pu.name,
    pu.role,
    pu.created_at as profile_created,
    CASE 
        WHEN pu.id IS NULL THEN 'USUARIO ORFANO'
        ELSE 'PERFIL OK'
    END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;
