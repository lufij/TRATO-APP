-- Script para agregar columnas faltantes en la tabla users
-- Ejecuta este script para corregir los errores de columnas faltantes

DO $$
BEGIN
    RAISE NOTICE '🔧 AGREGANDO COLUMNAS FALTANTES A LA TABLA USERS';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '';

    -- Verificar si la tabla users existe
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE '❌ La tabla users no existe. Ejecuta /database/fix_setup.sql primero';
        RETURN;
    END IF;

    RAISE NOTICE '✅ La tabla users existe, verificando columnas...';
    RAISE NOTICE '';

    -- Agregar business_name si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'business_name'
    ) THEN
        ALTER TABLE users ADD COLUMN business_name TEXT;
        RAISE NOTICE '✅ Columna business_name agregada';
    ELSE
        RAISE NOTICE '🔹 Columna business_name ya existe';
    END IF;

    -- Agregar business_description si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'business_description'
    ) THEN
        ALTER TABLE users ADD COLUMN business_description TEXT;
        RAISE NOTICE '✅ Columna business_description agregada';
    ELSE
        RAISE NOTICE '🔹 Columna business_description ya existe';
    END IF;

    -- Agregar business_rating si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'business_rating'
    ) THEN
        ALTER TABLE users ADD COLUMN business_rating DECIMAL(3,2) DEFAULT 4.5;
        RAISE NOTICE '✅ Columna business_rating agregada con valor por defecto 4.5';
    ELSE
        RAISE NOTICE '🔹 Columna business_rating ya existe';
    END IF;

    -- Agregar total_reviews si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'total_reviews'
    ) THEN
        ALTER TABLE users ADD COLUMN total_reviews INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Columna total_reviews agregada con valor por defecto 0';
    ELSE
        RAISE NOTICE '🔹 Columna total_reviews ya existe';
    END IF;

    -- Agregar profile_image_url si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE users ADD COLUMN profile_image_url TEXT;
        RAISE NOTICE '✅ Columna profile_image_url agregada';
    ELSE
        RAISE NOTICE '🔹 Columna profile_image_url ya existe';
    END IF;

    -- Agregar is_open si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_open'
    ) THEN
        ALTER TABLE users ADD COLUMN is_open BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Columna is_open agregada con valor por defecto true';
    ELSE
        RAISE NOTICE '🔹 Columna is_open ya existe';
    END IF;

    -- Agregar phone si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
        RAISE NOTICE '✅ Columna phone agregada';
    ELSE
        RAISE NOTICE '🔹 Columna phone ya existe';
    END IF;

    -- Agregar address si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'address'
    ) THEN
        ALTER TABLE users ADD COLUMN address TEXT;
        RAISE NOTICE '✅ Columna address agregada';
    ELSE
        RAISE NOTICE '🔹 Columna address ya existe';
    END IF;

    -- Agregar is_active si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Columna is_active agregada con valor por defecto true';
    ELSE
        RAISE NOTICE '🔹 Columna is_active ya existe';
    END IF;

    -- Agregar role si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role TEXT;
        RAISE NOTICE '✅ Columna role agregada';
    ELSE
        RAISE NOTICE '🔹 Columna role ya existe';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎯 ACTUALIZANDO DATOS EXISTENTES...';
    RAISE NOTICE '===================================';

    -- Actualizar usuarios existentes sin business_name
    UPDATE users 
    SET business_name = COALESCE(business_name, name || '''s Business')
    WHERE business_name IS NULL AND role = 'vendedor';

    -- Actualizar usuarios existentes sin business_description
    UPDATE users 
    SET business_description = COALESCE(business_description, 'Comercio local en Gualán')
    WHERE business_description IS NULL AND role = 'vendedor';

    -- Actualizar usuarios existentes sin phone
    UPDATE users 
    SET phone = COALESCE(phone, '+502 0000-0000')
    WHERE phone IS NULL;

    -- Actualizar usuarios existentes sin address
    UPDATE users 
    SET address = COALESCE(address, 'Gualán, Zacapa, Guatemala')
    WHERE address IS NULL;

    RAISE NOTICE '✅ Datos existentes actualizados';
    RAISE NOTICE '';

    RAISE NOTICE '📊 VERIFICACIÓN FINAL:';
    RAISE NOTICE '====================';

    -- Mostrar estadísticas de la tabla users
    DECLARE
        total_users INTEGER;
        vendors INTEGER;
        buyers INTEGER;
        drivers INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_users FROM users;
        SELECT COUNT(*) INTO vendors FROM users WHERE role = 'vendedor';
        SELECT COUNT(*) INTO buyers FROM users WHERE role = 'comprador';
        SELECT COUNT(*) INTO drivers FROM users WHERE role = 'repartidor';

        RAISE NOTICE '• Total usuarios: %', total_users;
        RAISE NOTICE '• Vendedores: %', vendors;
        RAISE NOTICE '• Compradores: %', buyers;
        RAISE NOTICE '• Repartidores: %', drivers;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '✅ COLUMNAS AGREGADAS EXITOSAMENTE';
    RAISE NOTICE 'El marketplace debería funcionar correctamente ahora.';
    RAISE NOTICE '';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Verifica que tengas permisos para modificar la tabla users';
END $$;