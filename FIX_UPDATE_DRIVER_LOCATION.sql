-- FIX CRÍTICO: Actualizar función update_driver_location
-- Ejecutar en Supabase SQL Editor

-- Recrear la función con valores por defecto para campos requeridos
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
    
    -- Actualizar timestamp en drivers (o crear registro si no existe)
    INSERT INTO drivers (
        id, 
        vehicle_type, 
        license_number,
        is_online,
        rating,
        total_deliveries,
        last_location_update, 
        created_at,
        updated_at
    )
    VALUES (
        p_driver_id, 
        'motocicleta',  -- Valor por defecto
        'TEMP-' || EXTRACT(EPOCH FROM NOW())::TEXT, -- Licencia temporal
        false,          -- Inicialmente offline
        0.0,           -- Sin calificación inicial
        0,             -- Sin entregas
        NOW(), 
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        last_location_update = NOW(),
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Dar permisos
GRANT EXECUTE ON FUNCTION update_driver_location(UUID, DECIMAL, DECIMAL, TEXT) TO authenticated;
