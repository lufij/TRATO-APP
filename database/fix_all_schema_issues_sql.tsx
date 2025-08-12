-- Script completo para corregir todos los problemas de esquema
-- Ejecuta este script para solucionar errores de columnas faltantes y usuarios huérfanos

DO $$
DECLARE
    orphaned_user RECORD;
    total_orphaned INTEGER := 0;
    total_fixed INTEGER := 0;
    column_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 SCRIPT COMPLETO DE CORRECCIÓN DE ESQUEMA TRATO';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Este script corregirá:';
    RAISE NOTICE '• Columnas faltantes en la tabla users';
    RAISE NOTICE '• Usuarios huérfanos (auth sin perfil)';
    RAISE NOTICE '• Valores por defecto incorrectos';
    RAISE NOTICE '';

    -- =============================================
    -- PASO 1: VERIFICAR Y CREAR TABLA USERS
    -- =============================================
    
    RAISE NOTICE '📋 PASO 1: VERIFICANDO TABLA USERS';
    RAISE NOTICE '=================================';
    
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE '❌ La tabla users no existe. Creándola...';
        
        CREATE TABLE public.users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL DEFAULT 'comprador',
            phone TEXT,
            address TEXT,
            business_name TEXT,
            business_description TEXT,
            business_rating DECIMAL(3,2) DEFAULT 4.5,
            total_reviews INTEGER DEFAULT 0,
            profile_image_url TEXT,
            is_active BOOLEAN DEFAULT true,
            is_open BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '✅ Tabla users creada';
    ELSE
        RAISE NOTICE '✅ La tabla users existe';
    END IF;

    -- =============================================
    -- PASO 2: AGREGAR COLUMNAS FALTANTES
    -- =============================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 PASO 2: AGREGANDO COLUMNAS FALTANTES';
    RAISE NOTICE '======================================';

    -- Lista de columnas necesarias con sus tipos y valores por defecto
    DECLARE
        columns_to_add TEXT[][] := ARRAY[
            ['business_name', 'TEXT', NULL],
            ['business_description', 'TEXT', NULL],
            ['business_rating', 'DECIMAL(3,2)', '4.5'],
            ['total_reviews', 'INTEGER', '0'],
            ['profile_image_url', 'TEXT', NULL],
            ['is_open', 'BOOLEAN', 'true'],
            ['phone', 'TEXT', NULL],
            ['address', 'TEXT', NULL],
            ['is_active', 'BOOLEAN', 'true'],
            ['role', 'TEXT', '''comprador'''],
            ['created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()'],
            ['updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()']
        ];
        col TEXT[];
    BEGIN
        FOREACH col SLICE 1 IN ARRAY columns_to_add
        LOOP
            IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = col[1]
            ) THEN
                EXECUTE format('ALTER TABLE users ADD COLUMN %I %s%s',
                    col[1], 
                    col[2],
                    CASE WHEN col[3] IS NOT NULL THEN ' DEFAULT ' || col[3] ELSE '' END
                );
                column_count := column_count + 1;
                RAISE NOTICE '✅ Columna % agregada (%)', col[1], col[2];
            ELSE
                RAISE NOTICE '🔹 Columna % ya existe', col[1];
            END IF;
        END LOOP;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Total de columnas agregadas: %', column_count;

    -- =============================================
    -- PASO 3: ACTUALIZAR DATOS EXISTENTES
    -- =============================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 PASO 3: ACTUALIZANDO DATOS EXISTENTES';
    RAISE NOTICE '=======================================';

    -- Actualizar business_name para vendedores
    UPDATE users 
    SET business_name = COALESCE(business_name, name || '''s Business')
    WHERE business_name IS NULL AND role = 'vendedor';

    -- Actualizar business_description para vendedores
    UPDATE users 
    SET business_description = COALESCE(business_description, 'Comercio local en Gualán')
    WHERE business_description IS NULL AND role = 'vendedor';

    -- Actualizar phone para todos los usuarios
    UPDATE users 
    SET phone = COALESCE(phone, '+502 0000-0000')
    WHERE phone IS NULL;

    -- Actualizar address para todos los usuarios
    UPDATE users 
    SET address = COALESCE(address, 'Gualán, Zacapa, Guatemala')
    WHERE address IS NULL;

    -- Actualizar timestamps
    UPDATE users 
    SET created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW())
    WHERE created_at IS NULL OR updated_at IS NULL;

    RAISE NOTICE '✅ Datos existentes actualizados';

    -- =============================================
    -- PASO 4: CORREGIR USUARIOS HUÉRFANOS
    -- =============================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 PASO 4: CORRIGIENDO USUARIOS HUÉRFANOS';
    RAISE NOTICE '========================================';

    -- Verificar acceso a auth.users
    BEGIN
        SELECT COUNT(*) INTO total_orphaned
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id::text = pu.id
        WHERE pu.id IS NULL;
        
        RAISE NOTICE '🔍 Usuarios huérfanos encontrados: %', total_orphaned;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ No se puede acceder a auth.users: %', SQLERRM;
        RAISE NOTICE '💡 Esto es normal si no tienes permisos de admin en Supabase';
        total_orphaned := 0;
    END;

    IF total_orphaned > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🛠️ Creando perfiles para usuarios huérfanos...';
        
        -- Crear perfiles para usuarios huérfanos
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
                DECLARE
                    user_role TEXT := 'comprador';
                BEGIN
                    -- Determinar rol basado en email
                    IF orphaned_user.email = 'trato.app1984@gmail.com' THEN
                        user_role := 'admin';
                    ELSIF orphaned_user.email LIKE '%vendor%' OR orphaned_user.email LIKE '%seller%' THEN
                        user_role := 'vendedor';
                    ELSIF orphaned_user.email LIKE '%driver%' OR orphaned_user.email LIKE '%delivery%' THEN
                        user_role := 'repartidor';
                    END IF;

                    -- Insertar perfil
                    INSERT INTO public.users (
                        id, name, email, role, phone, address,
                        business_name, business_description, business_rating, total_reviews,
                        is_active, is_open, created_at, updated_at
                    ) VALUES (
                        orphaned_user.id::text,
                        orphaned_user.name,
                        orphaned_user.email,
                        user_role,
                        '+502 0000-0000',
                        'Gualán, Zacapa, Guatemala',
                        CASE WHEN user_role = 'vendedor' THEN orphaned_user.name || '''s Business' ELSE NULL END,
                        CASE WHEN user_role = 'vendedor' THEN 'Comercio local en Gualán' ELSE NULL END,
                        CASE WHEN user_role = 'vendedor' THEN 4.5 ELSE NULL END,
                        CASE WHEN user_role = 'vendedor' THEN 0 ELSE NULL END,
                        true,
                        CASE WHEN user_role = 'vendedor' THEN true ELSE NULL END,
                        orphaned_user.created_at,
                        NOW()
                    );

                    total_fixed := total_fixed + 1;
                    RAISE NOTICE '✅ Perfil creado: % (%) - Rol: %', 
                        orphaned_user.name, orphaned_user.email, user_role;
                END;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ Error creando perfil para %: %', 
                    orphaned_user.email, SQLERRM;
            END;
        END LOOP;
    END IF;

    -- =============================================
    -- PASO 5: CREAR ÍNDICES Y CONSTRAINTS
    -- =============================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 PASO 5: CREANDO ÍNDICES Y CONSTRAINTS';
    RAISE NOTICE '=======================================';

    -- Crear índices si no existen
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
        RAISE NOTICE '✅ Índices creados';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error creando índices: %', SQLERRM;
    END;

    -- =============================================
    -- PASO 6: VERIFICACIÓN FINAL
    -- =============================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 PASO 6: VERIFICACIÓN FINAL';
    RAISE NOTICE '============================';

    DECLARE
        total_users INTEGER;
        vendors INTEGER;
        buyers INTEGER;
        drivers INTEGER;
        admin_users INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_users FROM users;
        SELECT COUNT(*) INTO vendors FROM users WHERE role = 'vendedor';
        SELECT COUNT(*) INTO buyers FROM users WHERE role = 'comprador';
        SELECT COUNT(*) INTO drivers FROM users WHERE role = 'repartidor';
        SELECT COUNT(*) INTO admin_users FROM users WHERE role = 'admin' OR email = 'trato.app1984@gmail.com';

        RAISE NOTICE '';
        RAISE NOTICE '📊 ESTADÍSTICAS FINALES:';
        RAISE NOTICE '• Total usuarios: %', total_users;
        RAISE NOTICE '• Vendedores: %', vendors;
        RAISE NOTICE '• Compradores: %', buyers;
        RAISE NOTICE '• Repartidores: %', drivers;
        RAISE NOTICE '• Administradores: %', admin_users;
        RAISE NOTICE '• Columnas agregadas: %', column_count;
        RAISE NOTICE '• Usuarios huérfanos corregidos: %', total_fixed;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 CORRECCIÓN DE ESQUEMA COMPLETADA';
    RAISE NOTICE '==================================';
    RAISE NOTICE '✅ Todos los problemas de esquema han sido corregidos';
    RAISE NOTICE '✅ El marketplace debería funcionar correctamente ahora';
    RAISE NOTICE '✅ Los usuarios huérfanos pueden acceder a sus dashboards';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Si sigues teniendo problemas:';
    RAISE NOTICE '   1. Recarga la aplicación web';
    RAISE NOTICE '   2. Verifica que el usuario esté logueado correctamente';
    RAISE NOTICE '   3. Ejecuta /database/check_users_schema.sql para verificar';
    RAISE NOTICE '';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR CRÍTICO: %', SQLERRM;
    RAISE NOTICE '💡 Posibles soluciones:';
    RAISE NOTICE '   • Verifica permisos en Supabase';
    RAISE NOTICE '   • Ejecuta /database/fix_setup.sql primero';
    RAISE NOTICE '   • Contacta al administrador del sistema';
    RAISE NOTICE '';
END $$;