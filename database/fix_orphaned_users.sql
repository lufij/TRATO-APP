-- Script para corregir usuarios huérfanos (autenticados pero sin perfil en users table)
-- Ejecuta este script para sincronizar auth.users con public.users

DO $$
DECLARE
    orphaned_user RECORD;
    total_orphaned INTEGER := 0;
    total_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 CORRIGIENDO USUARIOS HUÉRFANOS';
    RAISE NOTICE '=================================';
    RAISE NOTICE '';

    -- Verificar que la tabla users existe
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE '❌ La tabla public.users no existe';
        RAISE NOTICE '💡 Ejecuta /database/fix_setup.sql primero';
        RETURN;
    END IF;

    -- Contar usuarios huérfanos
    SELECT COUNT(*) INTO total_orphaned
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id::text = pu.id
    WHERE pu.id IS NULL;

    RAISE NOTICE '🔍 Usuarios huérfanos encontrados: %', total_orphaned;
    RAISE NOTICE '';

    IF total_orphaned = 0 THEN
        RAISE NOTICE '✅ No hay usuarios huérfanos que corregir';
        RETURN;
    END IF;

    RAISE NOTICE '🛠️ Creando perfiles para usuarios huérfanos...';
    RAISE NOTICE '';

    -- Iterar sobre usuarios huérfanos y crear perfiles
    FOR orphaned_user IN
        SELECT 
            au.id,
            au.email,
            au.created_at,
            COALESCE(au.raw_user_meta_data->>'name', 
                     split_part(au.email, '@', 1)) as name
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id::text = pu.id
        WHERE pu.id IS NULL
    LOOP
        BEGIN
            -- Determinar el rol basado en el email
            DECLARE
                user_role TEXT := 'comprador'; -- por defecto
            BEGIN
                IF orphaned_user.email = 'trato.app1984@gmail.com' THEN
                    user_role := 'admin';
                ELSIF orphaned_user.email LIKE '%vendor%' OR orphaned_user.email LIKE '%seller%' THEN
                    user_role := 'vendedor';
                ELSIF orphaned_user.email LIKE '%driver%' OR orphaned_user.email LIKE '%delivery%' THEN
                    user_role := 'repartidor';
                END IF;

                -- Insertar el usuario en public.users
                INSERT INTO public.users (
                    id,
                    name,
                    email,
                    role,
                    phone,
                    address,
                    business_name,
                    business_description,
                    business_rating,
                    total_reviews,
                    is_active,
                    is_open,
                    created_at,
                    updated_at
                ) VALUES (
                    orphaned_user.id::text,
                    orphaned_user.name,
                    orphaned_user.email,
                    user_role,
                    '+502 0000-0000', -- teléfono por defecto
                    'Gualán, Zacapa, Guatemala', -- dirección por defecto
                    CASE 
                        WHEN user_role = 'vendedor' THEN orphaned_user.name || '''s Business'
                        ELSE NULL 
                    END,
                    CASE 
                        WHEN user_role = 'vendedor' THEN 'Comercio local en Gualán'
                        ELSE NULL 
                    END,
                    CASE 
                        WHEN user_role = 'vendedor' THEN 4.5
                        ELSE NULL 
                    END,
                    CASE 
                        WHEN user_role = 'vendedor' THEN 0
                        ELSE NULL 
                    END,
                    true, -- is_active
                    CASE 
                        WHEN user_role = 'vendedor' THEN true
                        ELSE NULL 
                    END, -- is_open
                    orphaned_user.created_at,
                    NOW()
                );

                total_fixed := total_fixed + 1;
                RAISE NOTICE '✅ Perfil creado para: % (%) - Rol: %', 
                    orphaned_user.name, orphaned_user.email, user_role;

            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ Error creando perfil para %: %', 
                    orphaned_user.email, SQLERRM;
            END;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN:';
    RAISE NOTICE '===========';
    RAISE NOTICE '• Usuarios huérfanos encontrados: %', total_orphaned;
    RAISE NOTICE '• Perfiles creados exitosamente: %', total_fixed;
    RAISE NOTICE '• Errores: %', (total_orphaned - total_fixed);
    RAISE NOTICE '';

    IF total_fixed > 0 THEN
        RAISE NOTICE '✅ USUARIOS HUÉRFANOS CORREGIDOS';
        RAISE NOTICE 'Los usuarios ahora pueden acceder a sus dashboards correctamente.';
    ELSE
        RAISE NOTICE '⚠️ No se pudieron corregir usuarios huérfanos';
        RAISE NOTICE 'Verifica los permisos y la estructura de la base de datos.';
    END IF;

    RAISE NOTICE '';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR GENERAL: %', SQLERRM;
    RAISE NOTICE '💡 Verifica que tengas permisos para acceder a auth.users y modificar public.users';
END $$;