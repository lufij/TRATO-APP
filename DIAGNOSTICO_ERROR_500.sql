-- =====================================================
-- DIAGNÓSTICO URGENTE: ERROR 500 EN REGISTRO
-- =====================================================
-- Ejecutar para diagnosticar el error Database error saving new user
-- =====================================================

-- VERIFICAR ESTADO ACTUAL DE LA BASE DE DATOS
SELECT 
    'DIAGNÓSTICO DE REGISTRO - ' || NOW()::text as inicio_diagnostico;

-- 1. VERIFICAR TIPO user_role EXISTE
SELECT 
    typname as tipo_name,
    oid as tipo_id,
    typelem as elemento
FROM pg_type 
WHERE typname = 'user_role';

-- 2. VERIFICAR ESTRUCTURA TABLA USERS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. VERIFICAR CONSTRAINTS
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'users';

-- 4. VERIFICAR TRIGGERS INSTALADOS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- 5. VERIFICAR POLÍTICAS RLS
SELECT 
    policyname as politica,
    cmd as tipo_operacion,
    permissive as permisiva,
    qual as condicion
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 6. VERIFICAR PERMISOS EN TABLA USERS
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name = 'users';

-- 7. VERIFICAR FUNCIÓN handle_new_user
SELECT 
    proname as funcion_name,
    prosrc as codigo_funcion
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 8. PROBAR INSERT MANUAL SIMPLE
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 PROBANDO INSERT MANUAL EN public.users...';
    
    BEGIN
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'test-diagnostico@trato.app',
            'Usuario Test',
            'comprador'::user_role,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ INSERT manual exitoso - tabla users funciona correctamente';
        
        -- Limpiar el test
        DELETE FROM public.users WHERE email = 'test-diagnostico@trato.app';
        RAISE NOTICE '🧹 Test data eliminada';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR en INSERT manual: %', SQLERRM;
    END;
END $$;

-- 9. VERIFICAR auth.users vs public.users
SELECT 
    (SELECT COUNT(*) FROM auth.users) as usuarios_auth,
    (SELECT COUNT(*) FROM public.users) as usuarios_public,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as huerfanos;

-- 10. MOSTRAR ÚLTIMOS LOGS DE ERROR (SI EXISTEN)
SELECT 
    'DIAGNÓSTICO COMPLETADO - VERIFICAR RESULTADOS ARRIBA' as resultado_diagnostico;
