-- =====================================================
-- SISTEMA COMPLETO DE UBICACIÓN GPS PARA COMPRADORES
-- =====================================================
-- Ejecutar en SQL Editor de Supabase

-- 🗂️ PASO 1: Actualizar tabla users para incluir información GPS
DO $$
BEGIN
    -- Agregar columnas de ubicación al perfil del usuario
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'primary_latitude'
    ) THEN
        ALTER TABLE public.users ADD COLUMN primary_latitude DECIMAL(10,8);
        RAISE NOTICE '✅ Columna primary_latitude agregada a users';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'primary_longitude'
    ) THEN
        ALTER TABLE public.users ADD COLUMN primary_longitude DECIMAL(11,8);
        RAISE NOTICE '✅ Columna primary_longitude agregada a users';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'primary_address'
    ) THEN
        ALTER TABLE public.users ADD COLUMN primary_address TEXT;
        RAISE NOTICE '✅ Columna primary_address agregada a users';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'gps_verified'
    ) THEN
        ALTER TABLE public.users ADD COLUMN gps_verified BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Columna gps_verified agregada a users';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'gps_verified_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN gps_verified_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Columna gps_verified_at agregada a users';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'delivery_instructions'
    ) THEN
        ALTER TABLE public.users ADD COLUMN delivery_instructions TEXT;
        RAISE NOTICE '✅ Columna delivery_instructions agregada a users';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'location_accuracy'
    ) THEN
        ALTER TABLE public.users ADD COLUMN location_accuracy INTEGER;
        RAISE NOTICE '✅ Columna location_accuracy agregada a users';
    END IF;
    
END $$;

-- 🗂️ PASO 2: Actualizar tabla orders para incluir información completa de entrega
DO $$
BEGIN
    -- Agregar columnas de ubicación de entrega a orders
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_latitude'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_latitude DECIMAL(10,8);
        RAISE NOTICE '✅ Columna delivery_latitude agregada a orders';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_longitude'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_longitude DECIMAL(11,8);
        RAISE NOTICE '✅ Columna delivery_longitude agregada a orders';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_accuracy'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_accuracy INTEGER;
        RAISE NOTICE '✅ Columna delivery_accuracy agregada a orders';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_instructions'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_instructions TEXT;
        RAISE NOTICE '✅ Columna delivery_instructions agregada a orders';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_phone'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
        RAISE NOTICE '✅ Columna customer_phone agregada a orders';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_address_formatted'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address_formatted TEXT;
        RAISE NOTICE '✅ Columna delivery_address_formatted agregada a orders';
    END IF;
    
END $$;

-- ⚙️ PASO 3: Función para actualizar ubicación del perfil del usuario
CREATE OR REPLACE FUNCTION public.update_user_location(
    p_user_id UUID,
    p_latitude DECIMAL(10,8),
    p_longitude DECIMAL(11,8),
    p_address TEXT,
    p_accuracy INTEGER DEFAULT NULL,
    p_delivery_instructions TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    -- Validar parámetros
    IF p_user_id IS NULL OR p_latitude IS NULL OR p_longitude IS NULL THEN
        RETURN QUERY SELECT false, 'ID de usuario, latitud y longitud son requeridos'::TEXT;
        RETURN;
    END IF;
    
    -- Validar que las coordenadas estén en rango válido
    IF p_latitude < -90 OR p_latitude > 90 THEN
        RETURN QUERY SELECT false, 'Latitud debe estar entre -90 y 90'::TEXT;
        RETURN;
    END IF;
    
    IF p_longitude < -180 OR p_longitude > 180 THEN
        RETURN QUERY SELECT false, 'Longitud debe estar entre -180 y 180'::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar ubicación del usuario
    UPDATE public.users
    SET 
        primary_latitude = p_latitude,
        primary_longitude = p_longitude,
        primary_address = p_address,
        gps_verified = true,
        gps_verified_at = NOW(),
        location_accuracy = p_accuracy,
        delivery_instructions = COALESCE(p_delivery_instructions, delivery_instructions),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Ubicación actualizada exitosamente'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'Usuario no encontrado'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ⚙️ PASO 4: Función para obtener información completa del usuario para checkout
CREATE OR REPLACE FUNCTION public.get_user_profile_for_checkout(
    p_user_id UUID
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    primary_address TEXT,
    primary_latitude DECIMAL(10,8),
    primary_longitude DECIMAL(11,8),
    gps_verified BOOLEAN,
    delivery_instructions TEXT,
    location_accuracy INTEGER,
    has_complete_profile BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.primary_address,
        u.primary_latitude,
        u.primary_longitude,
        COALESCE(u.gps_verified, false),
        u.delivery_instructions,
        u.location_accuracy,
        (u.name IS NOT NULL AND u.phone IS NOT NULL AND u.primary_address IS NOT NULL AND u.gps_verified = true) as has_complete_profile
    FROM public.users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ⚙️ PASO 5: Función para generar información de entrega para repartidores
CREATE OR REPLACE FUNCTION public.generate_delivery_info_for_driver(
    p_order_id UUID
)
RETURNS TABLE (
    driver_info_text TEXT,
    google_maps_link TEXT,
    waze_link TEXT
) AS $$
DECLARE
    order_info RECORD;
    customer_info RECORD;
    seller_info RECORD;
    delivery_text TEXT;
    maps_link TEXT;
    waze_link TEXT;
BEGIN
    -- Obtener información de la orden
    SELECT 
        o.customer_name,
        o.delivery_address,
        o.delivery_latitude,
        o.delivery_longitude,
        o.delivery_instructions,
        o.total,
        o.delivery_type,
        o.customer_phone,
        o.seller_id
    INTO order_info
    FROM public.orders o
    WHERE o.id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            'Orden no encontrada'::TEXT,
            ''::TEXT,
            ''::TEXT;
        RETURN;
    END IF;
    
    -- Obtener información del vendedor
    SELECT name, address
    INTO seller_info
    FROM public.sellers
    WHERE id = order_info.seller_id;
    
    -- Crear links de navegación si hay coordenadas GPS
    IF order_info.delivery_latitude IS NOT NULL AND order_info.delivery_longitude IS NOT NULL THEN
        maps_link := 'https://www.google.com/maps?q=' || order_info.delivery_latitude || ',' || order_info.delivery_longitude;
        waze_link := 'https://waze.com/ul?ll=' || order_info.delivery_latitude || ',' || order_info.delivery_longitude;
    ELSE
        maps_link := '';
        waze_link := '';
    END IF;
    
    -- Crear texto informativo para el repartidor
    delivery_text := '🚚 INFORMACIÓN DE ENTREGA' || E'\n\n';
    delivery_text := delivery_text || '📦 PEDIDO: #' || p_order_id || E'\n';
    delivery_text := delivery_text || '💰 TOTAL: Q' || order_info.total || E'\n';
    delivery_text := delivery_text || '🍽️ DESDE: ' || COALESCE(seller_info.name, 'Restaurante') || E'\n';
    delivery_text := delivery_text || '📍 DESDE: ' || COALESCE(seller_info.address, 'Dirección no disponible') || E'\n\n';
    
    delivery_text := delivery_text || '👤 CLIENTE: ' || order_info.customer_name || E'\n';
    delivery_text := delivery_text || '📱 TELÉFONO: ' || COALESCE(order_info.customer_phone, 'No disponible') || E'\n';
    delivery_text := delivery_text || '🏠 ENTREGAR EN: ' || order_info.delivery_address || E'\n';
    
    IF order_info.delivery_latitude IS NOT NULL AND order_info.delivery_longitude IS NOT NULL THEN
        delivery_text := delivery_text || E'\n📊 COORDENADAS GPS:' || E'\n';
        delivery_text := delivery_text || '• Latitud: ' || order_info.delivery_latitude || E'\n';
        delivery_text := delivery_text || '• Longitud: ' || order_info.delivery_longitude || E'\n';
        delivery_text := delivery_text || E'\n🗺️ NAVEGACIÓN:' || E'\n';
        delivery_text := delivery_text || '• Google Maps: ' || maps_link || E'\n';
        delivery_text := delivery_text || '• Waze: ' || waze_link || E'\n';
    END IF;
    
    IF order_info.delivery_instructions IS NOT NULL AND order_info.delivery_instructions != '' THEN
        delivery_text := delivery_text || E'\n📝 INSTRUCCIONES ESPECIALES:' || E'\n';
        delivery_text := delivery_text || order_info.delivery_instructions || E'\n';
    END IF;
    
    delivery_text := delivery_text || E'\n✅ Confirma cuando recojas el pedido';
    delivery_text := delivery_text || E'\n✅ Confirma cuando entregues al cliente';
    
    RETURN QUERY SELECT 
        delivery_text,
        maps_link,
        waze_link;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔐 PASO 6: Permisos de seguridad
GRANT EXECUTE ON FUNCTION public.update_user_location(UUID, DECIMAL, DECIMAL, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_for_checkout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_delivery_info_for_driver(UUID) TO authenticated;

-- 🧪 PASO 7: Prueba de las funciones
DO $$
DECLARE
    test_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    result_record RECORD;
BEGIN
    RAISE NOTICE '🧪 PROBANDO funciones de ubicación GPS...';
    
    -- Probar actualización de ubicación
    FOR result_record IN 
        SELECT * FROM public.update_user_location(
            test_user_id, 
            15.1234567, 
            -89.1234567, 
            'Dirección de prueba, Gualán, Zacapa',
            10,
            'Casa color verde con portón negro'
        )
    LOOP
        RAISE NOTICE '📍 Update Location: success=%, message=%', result_record.success, result_record.message;
    END LOOP;
    
    RAISE NOTICE '✅ Funciones de ubicación GPS creadas exitosamente';
END $$;

-- 📊 PASO 8: Verificación final
SELECT 
    '✅ SISTEMA GPS COMPLETADO:' as status,
    COUNT(CASE WHEN column_name LIKE '%latitude%' OR column_name LIKE '%longitude%' THEN 1 END) as gps_columns_users,
    COUNT(CASE WHEN column_name LIKE '%delivery_%' THEN 1 END) as delivery_columns_orders
FROM information_schema.columns 
WHERE table_name IN ('users', 'orders') 
AND table_schema = 'public';

SELECT 'Sistema completo de ubicación GPS implementado para compradores y repartidores' as resultado;
