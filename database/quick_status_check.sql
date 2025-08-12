-- Verificación rápida del estado de Supabase para TRATO
-- Ejecuta este script para saber si necesitas hacer alguna configuración

DO $$
DECLARE
    table_count INTEGER;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    total_users INTEGER := 0;
    total_products INTEGER := 0;
    config_issues TEXT[] := ARRAY[]::TEXT[];
    status_color TEXT;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN RÁPIDA DEL ESTADO DE TRATO';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';

    -- 1. Verificar tablas esenciales
    RAISE NOTICE '📋 VERIFICANDO TABLAS ESENCIALES:';
    
    -- Lista de tablas requeridas
    WITH required_tables AS (
        SELECT unnest(ARRAY['users', 'products', 'cart_items', 'orders', 'order_items', 'user_addresses', 'notifications', 'conversations', 'messages']) AS table_name
    ),
    existing_tables AS (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    )
    SELECT array_agg(rt.table_name) INTO missing_tables
    FROM required_tables rt
    LEFT JOIN existing_tables et ON rt.table_name = et.table_name
    WHERE et.table_name IS NULL;

    IF array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '   ✅ Todas las tablas están presentes';
    ELSE
        RAISE NOTICE '   ❌ Tablas faltantes: %', array_to_string(missing_tables, ', ');
        config_issues := array_append(config_issues, 'Tablas faltantes');
    END IF;

    -- 2. Verificar funciones RPC
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  VERIFICANDO FUNCIONES RPC:';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'add_to_cart_safe') THEN
        missing_functions := array_append(missing_functions, 'add_to_cart_safe');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'cleanup_invalid_cart_items') THEN
        missing_functions := array_append(missing_functions, 'cleanup_invalid_cart_items');
    END IF;

    IF array_length(missing_functions, 1) IS NULL THEN
        RAISE NOTICE '   ✅ Todas las funciones RPC están presentes';
    ELSE
        RAISE NOTICE '   ❌ Funciones faltantes: %', array_to_string(missing_functions, ', ');
        config_issues := array_append(config_issues, 'Funciones RPC faltantes');
    END IF;

    -- 3. Verificar foreign keys críticas
    RAISE NOTICE '';
    RAISE NOTICE '🔗 VERIFICANDO FOREIGN KEYS:';
    
    -- cart_items -> products
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'cart_items' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.column_name = 'product_id'
    ) THEN
        RAISE NOTICE '   ❌ cart_items -> products FK faltante';
        config_issues := array_append(config_issues, 'Foreign key cart_items->products');
    ELSE
        RAISE NOTICE '   ✅ cart_items -> products FK OK';
    END IF;

    -- 4. Verificar datos básicos
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICANDO DATOS:';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COUNT(*) INTO total_users FROM users;
        RAISE NOTICE '   👥 Usuarios registrados: %', total_users;
        
        -- Verificar admin
        IF EXISTS (SELECT 1 FROM users WHERE email = 'trato.app1984@gmail.com') THEN
            RAISE NOTICE '   ✅ Usuario admin configurado';
        ELSE
            RAISE NOTICE '   ⚠️  Usuario admin no encontrado';
            config_issues := array_append(config_issues, 'Admin user missing');
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        SELECT COUNT(*) INTO total_products FROM products WHERE is_public = true;
        RAISE NOTICE '   📦 Productos públicos: %', total_products;
    END IF;

    -- 5. Verificar columnas críticas para checkout
    RAISE NOTICE '';
    RAISE NOTICE '🛒 VERIFICANDO SISTEMA DE CHECKOUT:';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'updated_at') THEN
        RAISE NOTICE '   ✅ cart_items.updated_at existe';
    ELSE
        RAISE NOTICE '   ❌ cart_items.updated_at faltante';
        config_issues := array_append(config_issues, 'cart_items updated_at column');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
        RAISE NOTICE '   ✅ orders.customer_name existe';
    ELSE
        RAISE NOTICE '   ❌ orders.customer_name faltante';
        config_issues := array_append(config_issues, 'orders customer_name column');
    END IF;

    -- 6. RESULTADO FINAL
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    
    IF array_length(config_issues, 1) IS NULL THEN
        status_color := '🟢';
        RAISE NOTICE '% ESTADO: ✅ SUPABASE CONFIGURADO CORRECTAMENTE', status_color;
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Tu base de datos está lista para usar.';
        RAISE NOTICE '🚀 Puedes abrir tu aplicación TRATO sin problemas.';
    ELSE
        status_color := '🔴';
        RAISE NOTICE '% ESTADO: ❌ CONFIGURACIÓN REQUERIDA', status_color;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Problemas detectados:';
        FOR i IN 1..array_length(config_issues, 1) LOOP
            RAISE NOTICE '   • %', config_issues[i];
        END LOOP;
        RAISE NOTICE '';
        RAISE NOTICE '💡 SOLUCIÓN:';
        RAISE NOTICE '   1. Ejecuta /database/fix_setup.sql';
        RAISE NOTICE '   2. Desactiva email confirmations en Auth Settings';
        RAISE NOTICE '   3. Recarga tu aplicación TRATO';
    END IF;
    
    RAISE NOTICE '================================================';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '🔴 ERROR: No se pudo conectar a la base de datos';
    RAISE NOTICE 'Verifica tus credenciales de Supabase en el archivo .env.local';
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;