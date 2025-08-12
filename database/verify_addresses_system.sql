-- =================================================================
-- VERIFICACIÓN DEL SISTEMA DE UBICACIONES DE USUARIOS
-- =================================================================
-- Este script verifica que el sistema de ubicaciones se instaló correctamente
-- =================================================================

DO $
DECLARE
    tables_count INTEGER := 0;
    columns_count INTEGER := 0;
    indexes_count INTEGER := 0;
    functions_count INTEGER := 0;
    triggers_count INTEGER := 0;
    policies_count INTEGER := 0;
    views_count INTEGER := 0;
    constraints_count INTEGER := 0;
    user_addresses_exists BOOLEAN;
    verification_log_exists BOOLEAN;
    users_columns_count INTEGER := 0;
    orders_columns_count INTEGER := 0;
    result_message TEXT;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VERIFICACIÓN COMPLETA DEL SISTEMA DE UBICACIONES';
    RAISE NOTICE '==========================================';
    
    -- 1. Verificar tablas principales
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_addresses'
    ) INTO user_addresses_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'location_verification_log'
    ) INTO verification_log_exists;
    
    tables_count := 0;
    IF user_addresses_exists THEN tables_count := tables_count + 1; END IF;
    IF verification_log_exists THEN tables_count := tables_count + 1; END IF;
    
    RAISE NOTICE '1. Tablas principales: % de 2', tables_count;
    RAISE NOTICE '   • user_addresses: %', CASE WHEN user_addresses_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   • location_verification_log: %', CASE WHEN verification_log_exists THEN '✅' ELSE '❌' END;
    
    -- 2. Verificar columnas en user_addresses
    SELECT COUNT(*) INTO columns_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'user_addresses'
    AND column_name IN ('id', 'user_id', 'latitude', 'longitude', 'is_verified', 'is_primary', 'delivery_instructions');
    
    RAISE NOTICE '2. Columnas en user_addresses: % de 7', columns_count;
    
    -- 3. Verificar columnas agregadas a users
    SELECT COUNT(*) INTO users_columns_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users'
    AND column_name IN ('current_latitude', 'current_longitude', 'location_permission_granted', 'primary_address_id');
    
    RAISE NOTICE '3. Columnas agregadas a users: % de 4', users_columns_count;
    
    -- 4. Verificar columnas agregadas a orders
    SELECT COUNT(*) INTO orders_columns_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'orders'
    AND column_name IN ('delivery_location', 'pickup_latitude', 'pickup_longitude');
    
    RAISE NOTICE '4. Columnas agregadas a orders: % de 3', orders_columns_count;
    
    -- 5. Verificar índices creados
    SELECT COUNT(*) INTO indexes_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
    AND indexname LIKE '%user_addresses%';
    
    RAISE NOTICE '5. Índices de user_addresses: %', indexes_count;
    
    -- 6. Verificar funciones creadas
    SELECT COUNT(*) INTO functions_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
    AND routine_name IN (
        'calculate_distance_accurate', 
        'set_primary_address', 
        'find_nearby_addresses', 
        'update_address_usage'
    );
    
    RAISE NOTICE '6. Funciones creadas: % de 4', functions_count;
    
    -- 7. Verificar triggers
    SELECT COUNT(*) INTO triggers_count
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' 
    AND trigger_name IN (
        'trigger_user_addresses_updated_at',
        'trigger_set_first_address_primary'
    );
    
    RAISE NOTICE '7. Triggers creados: % de 2', triggers_count;
    
    -- 8. Verificar políticas RLS
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename IN ('user_addresses', 'location_verification_log');
    
    RAISE NOTICE '8. Políticas RLS: %', policies_count;
    
    -- 9. Verificar vistas
    SELECT COUNT(*) INTO views_count
    FROM information_schema.views
    WHERE table_schema = 'public' 
    AND table_name IN ('user_addresses_detailed', 'user_location_stats');
    
    RAISE NOTICE '9. Vistas creadas: % de 2', views_count;
    
    -- 10. Verificar que user_addresses existe y tiene estructura correcta
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_addresses'
    ) INTO table_exists;
    
    -- 10. Verificar constraints y foreign keys
    SELECT COUNT(*) INTO constraints_count
    FROM pg_constraint 
    WHERE conname IN ('fk_users_primary_address', 'idx_user_addresses_one_primary_per_user');
    
    RAISE NOTICE '10. Constraints creados: %', constraints_count;
    
    -- 11. Evaluación general
    RAISE NOTICE '==========================================';
    
    IF user_addresses_exists AND verification_log_exists AND functions_count >= 3 AND users_columns_count >= 3 THEN
        RAISE NOTICE 'ESTADO: ✅ SISTEMA DE UBICACIONES INSTALADO CORRECTAMENTE';
        RAISE NOTICE '';
        RAISE NOTICE 'Funcionalidades disponibles:';
        RAISE NOTICE '• Múltiples direcciones por usuario';
        RAISE NOTICE '• Verificación GPS automática';
        RAISE NOTICE '• Instrucciones detalladas para repartidores';
        RAISE NOTICE '• Estadísticas de uso y éxito de entregas';
        RAISE NOTICE '• Búsqueda de direcciones cercanas';
        RAISE NOTICE '• Gestión de direcciones primarias';
        RAISE NOTICE '';
        RAISE NOTICE 'Próximos pasos:';
        RAISE NOTICE '1. Recargar la aplicación web';
        RAISE NOTICE '2. Ir al perfil de comprador';
        RAISE NOTICE '3. Probar la sección "Gestión de Ubicaciones"';
        RAISE NOTICE '4. Agregar direcciones con GPS';
        RAISE NOTICE '5. Probar el checkout con selección de direcciones';
    ELSE
        RAISE NOTICE 'ESTADO: ⚠️ INSTALACIÓN INCOMPLETA';
        RAISE NOTICE '';
        RAISE NOTICE 'Problemas detectados:';
        
        IF NOT user_addresses_exists THEN
            RAISE NOTICE '• Tabla user_addresses no existe';
        END IF;
        
        IF NOT verification_log_exists THEN
            RAISE NOTICE '• Tabla location_verification_log no existe';
        END IF;
        
        IF functions_count < 3 THEN
            RAISE NOTICE '• Funciones faltantes (% de 4)', functions_count;
        END IF;
        
        IF users_columns_count < 3 THEN
            RAISE NOTICE '• Columnas faltantes en users (% de 4)', users_columns_count;
        END IF;
        
        IF orders_columns_count < 2 THEN
            RAISE NOTICE '• Columnas faltantes en orders (% de 3)', orders_columns_count;
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE 'Solución:';
        RAISE NOTICE 'Ejecutar: /database/add_user_addresses_final.sql';
    END IF;
    
    RAISE NOTICE '==========================================';
    
END $$;

-- Mostrar algunas tablas para verificación manual
SELECT 'user_addresses' as tabla, COUNT(*) as registros FROM user_addresses
UNION ALL
SELECT 'location_verification_log' as tabla, COUNT(*) as registros FROM location_verification_log;

-- Mostrar estructura de user_addresses
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_addresses'
ORDER BY ordinal_position
LIMIT 10;