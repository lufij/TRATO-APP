-- =====================================================
-- VERIFICACIÓN DE CONTEXTO DE AUTENTICACIÓN SUPABASE
-- =====================================================
-- Este script verifica que las funciones de auth funcionan correctamente
-- y que las políticas RLS pueden acceder al contexto de usuario
--
-- 🔍 EJECUTAR EN SUPABASE SQL EDITOR
-- =====================================================

-- PASO 1: VERIFICAR FUNCIONES AUTH BÁSICAS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '🔍 === VERIFICACIÓN DE CONTEXTO AUTH ===';
    RAISE NOTICE '';
    RAISE NOTICE '1️⃣ Verificando funciones básicas de auth...';
END $$;

-- Verificar auth.uid() (será NULL en contexto SQL directo)
SELECT 
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 
            '✅ auth.uid() retorna: ' || auth.uid()::text
        ELSE 
            '⚠️ auth.uid() es NULL (normal en SQL editor)'
    END as auth_uid_test;

-- Verificar auth.jwt() (será NULL en contexto SQL directo)
SELECT 
    CASE 
        WHEN auth.jwt() IS NOT NULL THEN 
            '✅ auth.jwt() disponible'
        ELSE 
            '⚠️ auth.jwt() es NULL (normal en SQL editor)'
    END as auth_jwt_test;

-- Verificar auth.role() 
SELECT 
    CASE 
        WHEN auth.role() IS NOT NULL THEN 
            '✅ auth.role() retorna: ' || auth.role()::text
        ELSE 
            '⚠️ auth.role() es NULL'
    END as auth_role_test;

-- PASO 2: VERIFICAR ESQUEMAS Y PERMISOS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ Verificando esquemas y permisos...';
END $$;

-- Verificar que el esquema auth existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
        THEN '✅ Esquema auth EXISTE'
        ELSE '❌ ERROR: Esquema auth NO EXISTE'
    END as auth_schema_status;

-- Verificar funciones en esquema auth
SELECT 
    routine_name as funcion_auth,
    '✅ Disponible' as estado
FROM information_schema.routines 
WHERE routine_schema = 'auth' 
AND routine_name IN ('uid', 'jwt', 'role')
ORDER BY routine_name;

-- PASO 3: VERIFICAR POLÍTICAS RLS CON CONTEXTO AUTH
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ Verificando políticas RLS con contexto auth...';
END $$;

-- Mostrar políticas que usan auth.uid()
SELECT 
    schemaname || '.' || tablename as tabla,
    policyname as politica,
    CASE 
        WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' 
        THEN '✅ Usa auth.uid()'
        ELSE '⚠️ No usa auth.uid()'
    END as usa_auth,
    cmd as comando
FROM pg_policies 
WHERE schemaname = 'public'
AND (tablename = 'users' OR tablename = 'sellers' OR tablename = 'drivers')
ORDER BY tablename, policyname;

-- PASO 4: SIMULAR CONTEXTO DE USUARIO AUTENTICADO
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '4️⃣ Simulando operaciones con usuario autenticado...';
END $$;

-- Crear usuario de prueba temporal (si no existe)
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_count FROM public.users WHERE id = test_user_id;
    
    IF existing_count = 0 THEN
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            'test@example.com',
            'Usuario de Prueba',
            'comprador',
            NOW(),
            NOW()
        );
        RAISE NOTICE '✅ Usuario de prueba creado: %', test_user_id;
    ELSE
        RAISE NOTICE '⚠️ Usuario de prueba ya existe: %', test_user_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creando usuario de prueba: %', SQLERRM;
END $$;

-- PASO 5: VERIFICAR CONFIGURACIÓN JWT
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '5️⃣ Verificando configuración JWT...';
END $$;

-- Mostrar configuración actual de JWT (si está disponible)
SELECT 
    name as configuracion,
    setting as valor
FROM pg_settings 
WHERE name LIKE '%jwt%' OR name LIKE '%auth%'
ORDER BY name;

-- PASO 6: DIAGNÓSTICO DE RLS EN ACCIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '6️⃣ Probando RLS en condiciones reales...';
END $$;

-- Habilitar RLS debugging (si está disponible)
SET log_statement = 'all';
SET log_min_messages = 'info';

-- Probar SELECT con RLS
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, email, name, role 
FROM public.users 
LIMIT 5;

-- PASO 7: VERIFICAR TRIGGERS DE AUTH
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '7️⃣ Verificando triggers en auth.users...';
END $$;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    '✅ Configurado' as estado
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
ORDER BY trigger_name;

-- Si no hay triggers:
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count 
    FROM information_schema.triggers 
    WHERE event_object_schema = 'auth' 
    AND event_object_table = 'users';
    
    IF trigger_count = 0 THEN
        RAISE NOTICE '⚠️ NO HAY TRIGGERS en auth.users';
        RAISE NOTICE 'Esto podría explicar por qué no se crean perfiles automáticamente';
    ELSE
        RAISE NOTICE '✅ Se encontraron % triggers en auth.users', trigger_count;
    END IF;
END $$;

-- PASO 8: DIAGNÓSTICO FINAL
-- =====================================================
DO $$
DECLARE
    auth_users_count INTEGER;
    public_users_count INTEGER;
    policies_count INTEGER;
    triggers_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '8️⃣ === DIAGNÓSTICO FINAL ===';
    
    SELECT COUNT(*) INTO auth_users_count FROM auth.users;
    SELECT COUNT(*) INTO public_users_count FROM public.users;
    SELECT COUNT(*) INTO policies_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users';
    SELECT COUNT(*) INTO triggers_count FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN TÉCNICO:';
    RAISE NOTICE '==================';
    RAISE NOTICE 'Usuarios en auth.users: %', auth_users_count;
    RAISE NOTICE 'Usuarios en public.users: %', public_users_count;
    RAISE NOTICE 'Diferencia (huérfanos): %', auth_users_count - public_users_count;
    RAISE NOTICE 'Políticas RLS en users: %', policies_count;
    RAISE NOTICE 'Triggers en auth.users: %', triggers_count;
    RAISE NOTICE '';
    
    -- Diagnóstico específico
    IF auth_users_count - public_users_count > 0 THEN
        RAISE NOTICE '🚨 PROBLEMA CONFIRMADO: % usuarios huérfanos', auth_users_count - public_users_count;
        RAISE NOTICE 'SOLUCIÓN: Ejecutar SOLUCION_USUARIOS_URGENTE.sql';
    ELSE
        RAISE NOTICE '✅ No hay usuarios huérfanos';
    END IF;
    
    IF triggers_count = 0 THEN
        RAISE NOTICE '🚨 PROBLEMA: No hay triggers de auto-creación de perfiles';
        RAISE NOTICE 'SOLUCIÓN: Ejecutar SISTEMA_PREVENCION_USUARIOS.sql';
    ELSE
        RAISE NOTICE '✅ Triggers de auto-creación configurados';
    END IF;
    
    IF policies_count < 3 THEN
        RAISE NOTICE '🚨 PROBLEMA: Políticas RLS insuficientes (% de 3 mínimas)', policies_count;
        RAISE NOTICE 'SOLUCIÓN: Ejecutar SOLUCION_USUARIOS_URGENTE.sql';
    ELSE
        RAISE NOTICE '✅ Políticas RLS configuradas correctamente';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SIGUIENTE PASO: Probar registro desde la aplicación React';
END $$;

-- Limpiar usuario de prueba
DELETE FROM public.users WHERE email = 'test@example.com';

SELECT '✅ VERIFICACIÓN DE CONTEXTO AUTH COMPLETADA - ' || NOW()::text as resultado;
