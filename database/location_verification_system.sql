-- SISTEMA DE VERIFICACIÓN DE UBICACIONES Y PERFILES COMPLETOS
-- Este script agrega las columnas necesarias para ubicaciones y perfiles

-- 1. Agregar columnas de ubicación y perfil a la tabla users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Agregar columnas específicas para vendedores en la tabla sellers
ALTER TABLE public.sellers
ADD COLUMN IF NOT EXISTS business_latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS business_longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_location_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_publish_products BOOLEAN DEFAULT false;

-- 3. Crear función para verificar si un vendedor puede publicar productos
CREATE OR REPLACE FUNCTION check_seller_can_publish(seller_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    seller_record RECORD;
    can_publish BOOLEAN := false;
BEGIN
    -- Obtener información del usuario
    SELECT 
        phone, 
        profile_image_url, 
        location_verified,
        latitude,
        longitude,
        address
    INTO user_record
    FROM public.users 
    WHERE id = seller_user_id AND role = 'vendedor';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Obtener información del vendedor
    SELECT 
        business_name,
        business_description,
        cover_image_url,
        business_location_verified,
        business_latitude,
        business_longitude,
        business_address
    INTO seller_record
    FROM public.sellers 
    WHERE user_id = seller_user_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Verificar todos los requisitos
    IF (
        user_record.phone IS NOT NULL AND user_record.phone != '' AND
        user_record.profile_image_url IS NOT NULL AND user_record.profile_image_url != '' AND
        user_record.location_verified = true AND
        user_record.latitude IS NOT NULL AND
        user_record.longitude IS NOT NULL AND
        user_record.address IS NOT NULL AND user_record.address != '' AND
        seller_record.business_name IS NOT NULL AND seller_record.business_name != '' AND
        seller_record.business_description IS NOT NULL AND seller_record.business_description != '' AND
        seller_record.cover_image_url IS NOT NULL AND seller_record.cover_image_url != '' AND
        seller_record.business_location_verified = true AND
        seller_record.business_latitude IS NOT NULL AND
        seller_record.business_longitude IS NOT NULL AND
        seller_record.business_address IS NOT NULL AND seller_record.business_address != ''
    ) THEN
        can_publish := true;
        
        -- Actualizar el estado en la tabla sellers
        UPDATE public.sellers 
        SET can_publish_products = true 
        WHERE user_id = seller_user_id;
    ELSE
        -- Actualizar el estado en la tabla sellers
        UPDATE public.sellers 
        SET can_publish_products = false 
        WHERE user_id = seller_user_id;
    END IF;
    
    RETURN can_publish;
END;
$$;

-- 4. Crear función para verificar si un comprador puede completar compras
CREATE OR REPLACE FUNCTION check_buyer_can_purchase(buyer_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    can_purchase BOOLEAN := false;
BEGIN
    -- Obtener información del usuario
    SELECT 
        phone, 
        location_verified,
        latitude,
        longitude,
        address,
        profile_completed
    INTO user_record
    FROM public.users 
    WHERE id = buyer_user_id AND role = 'comprador';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Verificar todos los requisitos para compradores
    IF (
        user_record.phone IS NOT NULL AND user_record.phone != '' AND
        user_record.location_verified = true AND
        user_record.latitude IS NOT NULL AND
        user_record.longitude IS NOT NULL AND
        user_record.address IS NOT NULL AND user_record.address != ''
    ) THEN
        can_purchase := true;
        
        -- Actualizar el estado del perfil
        UPDATE public.users 
        SET profile_completed = true 
        WHERE id = buyer_user_id;
    ELSE
        -- Actualizar el estado del perfil
        UPDATE public.users 
        SET profile_completed = false 
        WHERE id = buyer_user_id;
    END IF;
    
    RETURN can_purchase;
END;
$$;

-- 5. Crear función para verificar si un repartidor puede tomar órdenes
CREATE OR REPLACE FUNCTION check_driver_can_work(driver_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    can_work BOOLEAN := false;
BEGIN
    -- Obtener información del repartidor
    SELECT 
        phone,
        location_verified,
        latitude,
        longitude,
        address,
        is_verified,
        is_active,
        vehicle_type,
        license_number
    INTO user_record
    FROM public.users 
    WHERE id = driver_user_id AND role = 'repartidor';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Verificar todos los requisitos para repartidores
    IF (
        user_record.phone IS NOT NULL AND user_record.phone != '' AND
        user_record.location_verified = true AND
        user_record.latitude IS NOT NULL AND
        user_record.longitude IS NOT NULL AND
        user_record.address IS NOT NULL AND user_record.address != '' AND
        user_record.is_verified = true AND
        user_record.is_active = true AND
        user_record.vehicle_type IS NOT NULL AND user_record.vehicle_type != 'No especificado' AND
        user_record.license_number IS NOT NULL AND user_record.license_number != 'No especificado'
    ) THEN
        can_work := true;
        
        -- Actualizar el estado del perfil
        UPDATE public.users 
        SET profile_completed = true 
        WHERE id = driver_user_id;
    ELSE
        -- Actualizar el estado del perfil
        UPDATE public.users 
        SET profile_completed = false 
        WHERE id = driver_user_id;
    END IF;
    
    RETURN can_work;
END;
$$;

-- 6. Crear función para actualizar ubicación de usuario
CREATE OR REPLACE FUNCTION update_user_location(
    user_id UUID,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    user_address TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users 
    SET 
        latitude = lat,
        longitude = lng,
        address = user_address,
        location_verified = true,
        location_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

-- 7. Crear función para actualizar ubicación de negocio
CREATE OR REPLACE FUNCTION update_business_location(
    seller_user_id UUID,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    business_addr TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.sellers 
    SET 
        business_latitude = lat,
        business_longitude = lng,
        business_address = business_addr,
        business_location_verified = true,
        updated_at = NOW()
    WHERE user_id = seller_user_id;
    
    RETURN FOUND;
END;
$$;

-- 8. Asegurar permisos para las funciones
GRANT EXECUTE ON FUNCTION check_seller_can_publish(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_buyer_can_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_driver_can_work(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_location(UUID, DECIMAL, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_business_location(UUID, DECIMAL, DECIMAL, TEXT) TO authenticated;

-- 9. Crear vista para obtener información completa de ubicaciones
CREATE OR REPLACE VIEW user_location_status AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.phone,
    u.latitude,
    u.longitude,
    u.address,
    u.location_verified,
    u.profile_image_url,
    u.profile_completed,
    u.location_updated_at,
    -- Para vendedores, incluir info del negocio
    s.business_name,
    s.business_latitude,
    s.business_longitude,
    s.business_address,
    s.business_location_verified,
    s.cover_image_url,
    s.can_publish_products,
    -- Para repartidores, incluir info del vehículo
    u.vehicle_type,
    u.license_number,
    u.is_verified,
    u.is_active
FROM public.users u
LEFT JOIN public.sellers s ON u.id = s.seller_id
WHERE u.role IN ('comprador', 'vendedor', 'repartidor');

GRANT SELECT ON user_location_status TO authenticated;

-- 10. Mostrar estado actual de usuarios
SELECT 
    role,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE location_verified = true) as with_location,
    COUNT(*) FILTER (WHERE profile_completed = true) as profile_complete
FROM public.users 
WHERE role IN ('comprador', 'vendedor', 'repartidor')
GROUP BY role
ORDER BY role;
