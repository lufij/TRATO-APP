-- =================================================================
-- PRUEBAS FUNCIONALES DEL SISTEMA DE UBICACIONES
-- =================================================================
-- Este script prueba que todas las funcionalidades estén funcionando
-- Solo ejecutar SI el sistema ya está instalado correctamente
-- =================================================================

-- 1. Crear dirección de prueba
DO $$
DECLARE
    test_user_id UUID;
    test_address_id UUID;
    address_count INTEGER;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'INICIANDO PRUEBAS DEL SISTEMA DE UBICACIONES';
    RAISE NOTICE '==========================================';
    
    -- Buscar un usuario existente para probar
    SELECT id INTO test_user_id 
    FROM users 
    WHERE role = 'comprador' 
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No hay usuarios compradores para probar';
        RAISE NOTICE 'Crea un usuario comprador primero en la aplicación';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Usuario de prueba encontrado: %', test_user_id;
    
    -- Insertar dirección de prueba
    INSERT INTO user_addresses (
        user_id,
        label,
        address_line1,
        address_line2,
        city,
        state,
        country,
        latitude,
        longitude,
        accuracy_meters,
        delivery_instructions,
        landmark,
        address_type,
        location_source,
        is_verified,
        verification_method,
        verification_date
    ) VALUES (
        test_user_id,
        'Casa de Prueba GPS',
        'Avenida Principal, Barrio Central',
        'Casa color azul con portón blanco',
        'Gualán',
        'Zacapa',
        'Guatemala',
        15.1331, -- Coordenadas aproximadas de Gualán
        -89.3611,
        10, -- 10 metros de precisión
        'Tocar el timbre dos veces, preguntar por María',
        'Cerca del parque central',
        'residential',
        'gps',
        true,
        'gps',
        NOW()
    ) RETURNING id INTO test_address_id;
    
    RAISE NOTICE '✅ Dirección de prueba creada: %', test_address_id;
    
    -- Verificar que se insertó correctamente
    SELECT COUNT(*) INTO address_count
    FROM user_addresses 
    WHERE id = test_address_id;
    
    IF address_count > 0 THEN
        RAISE NOTICE '✅ Dirección guardada correctamente en la base de datos';
    ELSE
        RAISE NOTICE '❌ Error: Dirección no se guardó';
        RETURN;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creando dirección de prueba: %', SQLERRM;
    RETURN;
END $$;

-- 2. Probar función de establecer dirección primaria
DO $$
DECLARE
    test_user_id UUID;
    test_address_id UUID;
    is_primary_after BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2. PROBANDO FUNCIÓN SET_PRIMARY_ADDRESS';
    RAISE NOTICE '----------------------------------------';
    
    -- Buscar dirección de prueba
    SELECT ua.user_id, ua.id INTO test_user_id, test_address_id
    FROM user_addresses ua
    WHERE ua.label = 'Casa de Prueba GPS'
    LIMIT 1;
    
    IF test_address_id IS NULL THEN
        RAISE NOTICE '⚠️ No se encontró dirección de prueba';
        RETURN;
    END IF;
    
    -- Probar función de establecer primaria
    PERFORM set_primary_address(test_user_id, test_address_id);
    
    -- Verificar que se estableció como primaria
    SELECT is_primary INTO is_primary_after
    FROM user_addresses 
    WHERE id = test_address_id;
    
    IF is_primary_after THEN
        RAISE NOTICE '✅ Función set_primary_address funciona correctamente';
    ELSE
        RAISE NOTICE '❌ Error: Función set_primary_address no funcionó';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error probando set_primary_address: %', SQLERRM;
END $$;

-- 3. Probar función de cálculo de distancia
DO $$
DECLARE
    distance_meters DECIMAL;
    test_lat DECIMAL := 15.1331; -- Gualán
    test_lng DECIMAL := -89.3611;
    guatemala_lat DECIMAL := 14.6349; -- Ciudad de Guatemala
    guatemala_lng DECIMAL := -90.5069;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3. PROBANDO FUNCIÓN CALCULATE_DISTANCE_ACCURATE';
    RAISE NOTICE '-----------------------------------------------';
    
    -- Calcular distancia entre Gualán y Ciudad de Guatemala
    SELECT calculate_distance_accurate(test_lat, test_lng, guatemala_lat, guatemala_lng) 
    INTO distance_meters;
    
    RAISE NOTICE '✅ Distancia Gualán ↔ Ciudad de Guatemala: % metros (% km)', 
        ROUND(distance_meters), ROUND(distance_meters/1000, 1);
    
    -- Probar distancia corta (mismo punto)
    SELECT calculate_distance_accurate(test_lat, test_lng, test_lat, test_lng) 
    INTO distance_meters;
    
    IF distance_meters < 1 THEN
        RAISE NOTICE '✅ Función calculate_distance_accurate funciona correctamente';
        RAISE NOTICE '   Distancia mismo punto: % metros', ROUND(distance_meters, 2);
    ELSE
        RAISE NOTICE '❌ Error: Distancia mismo punto debería ser 0';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error probando calculate_distance_accurate: %', SQLERRM;
END $$;

-- 4. Probar función de búsqueda de direcciones cercanas
DO $$
DECLARE
    nearby_count INTEGER;
    test_lat DECIMAL := 15.1331; -- Gualán
    test_lng DECIMAL := -89.3611;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '4. PROBANDO FUNCIÓN FIND_NEARBY_ADDRESSES';
    RAISE NOTICE '------------------------------------------';
    
    -- Buscar direcciones dentro de 1km
    SELECT COUNT(*) INTO nearby_count
    FROM find_nearby_addresses(test_lat, test_lng, 1000); -- 1000 metros = 1km
    
    RAISE NOTICE '✅ Direcciones encontradas dentro de 1km de Gualán: %', nearby_count;
    
    IF nearby_count > 0 THEN
        RAISE NOTICE '✅ Función find_nearby_addresses funciona correctamente';
        
        -- Mostrar las direcciones encontradas
        RAISE NOTICE '   Direcciones cercanas:';
        FOR rec IN 
            SELECT address_id, label, address_line1, distance_meters
            FROM find_nearby_addresses(test_lat, test_lng, 1000)
            LIMIT 3
        LOOP
            RAISE NOTICE '   • %: % (% metros)', rec.label, rec.address_line1, ROUND(rec.distance_meters);
        END LOOP;
    ELSE
        RAISE NOTICE '⚠️ No se encontraron direcciones cercanas (puede ser normal si no hay direcciones)';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error probando find_nearby_addresses: %', SQLERRM;
END $$;

-- 5. Probar función de actualización de estadísticas
DO $$
DECLARE
    test_address_id UUID;
    times_used_before INTEGER;
    times_used_after INTEGER;
    success_rate_after DECIMAL;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '5. PROBANDO FUNCIÓN UPDATE_ADDRESS_USAGE';
    RAISE NOTICE '----------------------------------------';
    
    -- Buscar dirección de prueba
    SELECT id, times_used INTO test_address_id, times_used_before
    FROM user_addresses
    WHERE label = 'Casa de Prueba GPS'
    LIMIT 1;
    
    IF test_address_id IS NULL THEN
        RAISE NOTICE '⚠️ No se encontró dirección de prueba';
        RETURN;
    END IF;
    
    RAISE NOTICE '   Usos antes: %', times_used_before;
    
    -- Simular entrega exitosa
    PERFORM update_address_usage(test_address_id, true);
    
    -- Verificar actualización
    SELECT times_used, delivery_success_rate 
    INTO times_used_after, success_rate_after
    FROM user_addresses 
    WHERE id = test_address_id;
    
    IF times_used_after = times_used_before + 1 THEN
        RAISE NOTICE '✅ Función update_address_usage funciona correctamente';
        RAISE NOTICE '   Usos después: %', times_used_after;
        RAISE NOTICE '   Tasa de éxito: %%', success_rate_after;
    ELSE
        RAISE NOTICE '❌ Error: times_used no se actualizó correctamente';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error probando update_address_usage: %', SQLERRM;
END $$;

-- 6. Verificar triggers automáticos
DO $$
DECLARE
    test_user_id UUID;
    new_address_id UUID;
    is_primary_auto BOOLEAN;
    user_primary_ref UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '6. PROBANDO TRIGGERS AUTOMÁTICOS';
    RAISE NOTICE '---------------------------------';
    
    -- Crear un usuario temporal para probar
    INSERT INTO users (name, email, role, phone) 
    VALUES ('Usuario Prueba GPS', 'test.gps@trato.app', 'comprador', '1234567890')
    RETURNING id INTO test_user_id;
    
    RAISE NOTICE '   Usuario temporal creado: %', test_user_id;
    
    -- Insertar primera dirección (debería ser automáticamente primaria)
    INSERT INTO user_addresses (
        user_id, label, address_line1, city, state, country, address_type
    ) VALUES (
        test_user_id, 'Primera Dirección', 'Calle de Prueba', 'Gualán', 'Zacapa', 'Guatemala', 'residential'
    ) RETURNING id INTO new_address_id;
    
    -- Verificar que se marcó como primaria automáticamente
    SELECT is_primary INTO is_primary_auto
    FROM user_addresses 
    WHERE id = new_address_id;
    
    -- Verificar que se actualizó la referencia en users
    SELECT primary_address_id INTO user_primary_ref
    FROM users 
    WHERE id = test_user_id;
    
    IF is_primary_auto AND user_primary_ref = new_address_id THEN
        RAISE NOTICE '✅ Trigger automático funciona correctamente';
        RAISE NOTICE '   Primera dirección se marcó como primaria automáticamente';
    ELSE
        RAISE NOTICE '❌ Error: Trigger automático no funcionó';
    END IF;
    
    -- Limpiar datos de prueba
    DELETE FROM user_addresses WHERE user_id = test_user_id;
    DELETE FROM users WHERE id = test_user_id;
    
    RAISE NOTICE '   Datos de prueba limpiados';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error probando triggers: %', SQLERRM;
    -- Intentar limpiar si hubo error
    BEGIN
        DELETE FROM user_addresses WHERE user_id = test_user_id;
        DELETE FROM users WHERE id = test_user_id;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorar errores de limpieza
    END;
END $$;

-- 7. Limpiar datos de prueba
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '7. LIMPIANDO DATOS DE PRUEBA';
    RAISE NOTICE '-----------------------------';
    
    -- Eliminar dirección de prueba
    DELETE FROM user_addresses WHERE label = 'Casa de Prueba GPS';
    
    RAISE NOTICE '✅ Datos de prueba eliminados';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error limpiando datos de prueba: %', SQLERRM;
END $$;

-- 8. Resultado final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎉 PRUEBAS DEL SISTEMA DE UBICACIONES COMPLETADAS';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Si todas las pruebas anteriores pasaron exitosamente,';
    RAISE NOTICE '   tu sistema de ubicaciones está completamente funcional';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Ve a tu aplicación TRATO';
    RAISE NOTICE '2. Inicia sesión como comprador';
    RAISE NOTICE '3. Ve a "Mi Perfil" → "Gestión de Ubicaciones"';
    RAISE NOTICE '4. Agrega tu primera dirección real';
    RAISE NOTICE '5. Permite acceso GPS cuando se solicite';
    RAISE NOTICE '6. Prueba el checkout con selección de direcciones';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 El sistema de ubicaciones GPS está listo para';
    RAISE NOTICE '   optimizar las entregas en Gualán!';
    RAISE NOTICE '==========================================';
END $$;