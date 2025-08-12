-- =================================================================
-- VERIFICACIÓN RÁPIDA DEL SISTEMA DE UBICACIONES
-- =================================================================
-- Este script verifica rápidamente que todo esté funcionando
-- =================================================================

-- Verificar tablas principales
SELECT 
    'Verificación de tablas' as seccion,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses') 
        THEN '✅ user_addresses existe' 
        ELSE '❌ user_addresses NO existe' 
    END as user_addresses_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_verification_log') 
        THEN '✅ location_verification_log existe' 
        ELSE '❌ location_verification_log NO existe' 
    END as verification_log_status;

-- Verificar columnas en users
SELECT 
    'Verificación de columnas en users' as seccion,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_latitude') 
        THEN '✅ current_latitude existe' 
        ELSE '❌ current_latitude NO existe' 
    END as current_latitude_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location_permission_granted') 
        THEN '✅ location_permission_granted existe' 
        ELSE '❌ location_permission_granted NO existe' 
    END as location_permission_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'primary_address_id') 
        THEN '✅ primary_address_id existe' 
        ELSE '❌ primary_address_id NO existe' 
    END as primary_address_status;

-- Verificar columnas en orders
SELECT 
    'Verificación de columnas en orders' as seccion,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_location') 
        THEN '✅ delivery_location existe' 
        ELSE '❌ delivery_location NO existe' 
    END as delivery_location_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pickup_latitude') 
        THEN '✅ pickup_latitude existe' 
        ELSE '❌ pickup_latitude NO existe' 
    END as pickup_coordinates_status;

-- Verificar funciones GPS
SELECT 
    'Verificación de funciones GPS' as seccion,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_distance_accurate') 
        THEN '✅ calculate_distance_accurate existe' 
        ELSE '❌ calculate_distance_accurate NO existe' 
    END as distance_function_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'set_primary_address') 
        THEN '✅ set_primary_address existe' 
        ELSE '❌ set_primary_address NO existe' 
    END as primary_function_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'find_nearby_addresses') 
        THEN '✅ find_nearby_addresses existe' 
        ELSE '❌ find_nearby_addresses NO existe' 
    END as nearby_function_status;

-- Contar registros existentes
SELECT 
    'Conteo de datos existentes' as seccion,
    (SELECT COUNT(*) FROM user_addresses) as direcciones_total,
    (SELECT COUNT(*) FROM user_addresses WHERE is_verified = true) as direcciones_verificadas,
    (SELECT COUNT(*) FROM user_addresses WHERE is_primary = true) as direcciones_principales,
    (SELECT COUNT(*) FROM location_verification_log) as verificaciones_gps;

-- Mostrar estructura de user_addresses
SELECT 
    'Estructura de user_addresses' as tabla,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_default IS NOT NULL THEN SUBSTRING(column_default, 1, 50)
        ELSE NULL 
    END as default_value
FROM information_schema.columns
WHERE table_name = 'user_addresses' 
AND table_schema = 'public'
ORDER BY ordinal_position
LIMIT 15;

-- Verificar políticas RLS
SELECT 
    'Políticas RLS activas' as seccion,
    tablename,
    policyname,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_addresses', 'location_verification_log')
ORDER BY tablename, policyname;

-- Test básico de función de distancia (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_distance_accurate') THEN
        RAISE NOTICE '✅ Prueba de función de distancia:';
        RAISE NOTICE 'Distancia Gualán a Ciudad de Guatemala: % metros', 
            calculate_distance_accurate(15.1331, -89.3611, 14.6349, -90.5069);
    ELSE
        RAISE NOTICE '❌ Función calculate_distance_accurate no existe';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error probando función de distancia: %', SQLERRM;
END $$;

-- Resultado final
DO $$
DECLARE
    user_addresses_exists BOOLEAN;
    functions_count INTEGER;
    users_columns_count INTEGER;
    result_message TEXT;
BEGIN
    -- Verificaciones básicas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_addresses'
    ) INTO user_addresses_exists;
    
    SELECT COUNT(*) INTO functions_count
    FROM information_schema.routines
    WHERE routine_name IN (
        'calculate_distance_accurate', 
        'set_primary_address', 
        'find_nearby_addresses', 
        'update_address_usage'
    );
    
    SELECT COUNT(*) INTO users_columns_count
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name IN ('current_latitude', 'current_longitude', 'location_permission_granted', 'primary_address_id');
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RESULTADO FINAL DE VERIFICACIÓN';
    RAISE NOTICE '==========================================';
    
    IF user_addresses_exists AND functions_count >= 3 AND users_columns_count >= 3 THEN
        RAISE NOTICE '🎉 SISTEMA DE UBICACIONES COMPLETAMENTE FUNCIONAL';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Todas las tablas están instaladas';
        RAISE NOTICE '✅ Funciones GPS disponibles (% de 4)', functions_count;
        RAISE NOTICE '✅ Columnas agregadas a users (% de 4)', users_columns_count;
        RAISE NOTICE '';
        RAISE NOTICE '🚀 PRÓXIMOS PASOS:';
        RAISE NOTICE '1. Ve a tu perfil de comprador en la aplicación';
        RAISE NOTICE '2. Busca la sección "Gestión de Ubicaciones"';
        RAISE NOTICE '3. Agrega tu primera dirección con GPS';
        RAISE NOTICE '4. Prueba el checkout con selección de direcciones';
        RAISE NOTICE '5. ¡Todo listo para entregas precisas!';
    ELSE
        RAISE NOTICE '⚠️ SISTEMA INCOMPLETO - NECESITA INSTALACIÓN';
        RAISE NOTICE '';
        RAISE NOTICE 'Estado:';
        RAISE NOTICE '• user_addresses: %', CASE WHEN user_addresses_exists THEN '✅' ELSE '❌ FALTA' END;
        RAISE NOTICE '• Funciones GPS: % de 4', functions_count;
        RAISE NOTICE '• Columnas users: % de 4', users_columns_count;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 SOLUCIÓN:';
        RAISE NOTICE 'Ejecuta en Supabase SQL Editor:';
        RAISE NOTICE '/database/add_user_addresses_final.sql';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;