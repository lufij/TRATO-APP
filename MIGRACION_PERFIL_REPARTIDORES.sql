-- MIGRACIÓN PARA PERFIL AVANZADO DE REPARTIDORES
-- Ejecutar en Supabase SQL Editor

-- 1. Asegurar que la tabla users tenga todas las columnas necesarias para repartidores
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 2. Asegurar que la tabla drivers tenga las columnas para estado en línea y estadísticas
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_role_verified ON users(role, is_verified) WHERE role = 'repartidor';
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_drivers_location_update ON drivers(last_location_update);

-- 4. Crear función para actualizar estadísticas de repartidores
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas cuando una orden se marca como entregada
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.driver_id IS NOT NULL THEN
        UPDATE drivers 
        SET 
            total_deliveries = COALESCE(total_deliveries, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.driver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para actualizar estadísticas automáticamente
DROP TRIGGER IF EXISTS trigger_update_driver_stats ON orders;
CREATE TRIGGER trigger_update_driver_stats
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_stats();

-- 6. Crear función para obtener repartidores en línea
CREATE OR REPLACE FUNCTION get_online_drivers(user_lat DECIMAL DEFAULT NULL, user_lng DECIMAL DEFAULT NULL)
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    profile_image TEXT,
    vehicle_type TEXT,
    rating DECIMAL,
    total_deliveries INTEGER,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as driver_id,
        u.name as driver_name,
        u.profile_image,
        COALESCE(u.vehicle_type, d.vehicle_type, 'No especificado') as vehicle_type,
        COALESCE(d.rating, 0.0) as rating,
        COALESCE(d.total_deliveries, 0) as total_deliveries,
        CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
            THEN ROUND(
                6371 * acos(
                    cos(radians(user_lat)) * cos(radians(u.latitude)) * 
                    cos(radians(u.longitude) - radians(user_lng)) + 
                    sin(radians(user_lat)) * sin(radians(u.latitude))
                )::numeric, 2
            )
            ELSE NULL 
        END as distance_km
    FROM users u
    LEFT JOIN drivers d ON u.id = d.id
    WHERE u.role = 'repartidor'
      AND u.is_verified = true
      AND u.is_active = true
      AND COALESCE(d.is_online, false) = true
      AND u.latitude IS NOT NULL
      AND u.longitude IS NOT NULL
    ORDER BY distance_km ASC NULLS LAST, d.rating DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear función para actualizar ubicación del repartidor
CREATE OR REPLACE FUNCTION update_driver_location(
    p_driver_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Actualizar ubicación en users
    UPDATE users 
    SET 
        latitude = p_latitude,
        longitude = p_longitude,
        address = COALESCE(p_address, address),
        location_verified = true,
        updated_at = NOW()
    WHERE id = p_driver_id AND role = 'repartidor';
    
    -- Actualizar timestamp en drivers
    UPDATE drivers 
    SET 
        last_location_update = NOW(),
        updated_at = NOW()
    WHERE id = p_driver_id;
    
    -- Crear registro si no existe
    INSERT INTO drivers (id, last_location_update, updated_at)
    VALUES (p_driver_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        last_location_update = NOW(),
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear bucket para imágenes de perfil si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Crear política de almacenamiento para imágenes de perfil
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 10. Dar permisos a las funciones
GRANT EXECUTE ON FUNCTION get_online_drivers(DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION update_driver_location(UUID, DECIMAL, DECIMAL, TEXT) TO authenticated;

-- 11. Crear vista para repartidores públicos
CREATE OR REPLACE VIEW public_drivers AS
SELECT 
    u.id,
    u.name,
    u.profile_image,
    COALESCE(u.vehicle_type, d.vehicle_type, 'No especificado') as vehicle_type,
    u.latitude,
    u.longitude,
    u.is_verified,
    COALESCE(d.is_online, false) as is_online,
    COALESCE(d.rating, 0.0) as rating,
    COALESCE(d.total_deliveries, 0) as total_deliveries,
    d.last_location_update
FROM users u
LEFT JOIN drivers d ON u.id = d.id
WHERE u.role = 'repartidor'
  AND u.is_verified = true
  AND u.is_active = true;

-- 12. Dar permisos a la vista
GRANT SELECT ON public_drivers TO authenticated;

-- ✅ MIGRACIÓN COMPLETADA
-- Ahora el sistema soporta:
-- - Fotos de perfil públicas
-- - Estado en línea/fuera de línea
-- - Verificación de ubicación GPS
-- - Estadísticas de entregas
-- - Funciones optimizadas para la app
