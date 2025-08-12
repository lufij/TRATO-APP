-- =================================================================
-- SISTEMA DE DIRECCIONES DE USUARIOS PARA ENTREGAS OPTIMIZADAS
-- =================================================================
-- Este script crea la infraestructura para manejar múltiples direcciones
-- de usuarios con verificación GPS y compartir con repartidores
-- =================================================================

-- 1. CREAR TABLA USER_ADDRESSES (Direcciones de usuarios)
-- =================================================================

CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) DEFAULT 'Gualán',
    state VARCHAR(100) DEFAULT 'Zacapa',
    country VARCHAR(100) DEFAULT 'Guatemala',
    postal_code VARCHAR(20),
    
    -- Coordenadas GPS precisas
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy_meters INTEGER,
    
    -- Referencias de ubicación
    google_place_id VARCHAR(255),
    what3words VARCHAR(255),
    
    -- Detalles adicionales para repartidores
    delivery_instructions TEXT,
    landmark TEXT,
    access_notes TEXT,
    
    -- Estado y verificación
    is_verified BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata para delivery
    address_type VARCHAR(20) DEFAULT 'residential' CHECK (address_type IN ('residential', 'business', 'other')),
    building_type VARCHAR(20),
    floor_number VARCHAR(10),
    apartment_number VARCHAR(20),
    
    -- Tiempos de disponibilidad
    available_from TIME,
    available_to TIME,
    available_days JSONB,
    
    -- Control de calidad de ubicación
    location_source VARCHAR(20) DEFAULT 'manual' CHECK (location_source IN ('gps', 'manual', 'google_maps', 'what3words')),
    verification_method VARCHAR(20) CHECK (verification_method IN ('gps', 'manual', 'google_places', 'delivery_confirmed')),
    verification_date TIMESTAMPTZ,
    
    -- Uso y estadísticas
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    delivery_success_rate DECIMAL(5,2) DEFAULT 100.00,
    
    -- Metadatos adicionales
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREAR TABLA LOCATION_VERIFICATION_LOG
-- =================================================================

CREATE TABLE IF NOT EXISTS location_verification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_id UUID NOT NULL REFERENCES user_addresses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('gps', 'google_places', 'delivery_success', 'manual')),
    original_latitude DECIMAL(10, 8),
    original_longitude DECIMAL(11, 8),
    verified_latitude DECIMAL(10, 8),
    verified_longitude DECIMAL(11, 8),
    accuracy_meters INTEGER,
    
    -- Resultados de verificación
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('verified', 'failed', 'approximate')),
    confidence_score DECIMAL(5,2),
    
    -- Detalles adicionales
    google_place_id VARCHAR(255),
    google_formatted_address TEXT,
    what3words_code VARCHAR(255),
    verification_notes TEXT,
    
    -- Verificación por entrega exitosa
    order_id UUID,
    driver_id UUID,
    delivery_confirmation_rating INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AGREGAR COLUMNAS A TABLA USERS
-- =================================================================

-- Columna para ubicación actual GPS
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_permission_granted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_address_id UUID;

-- 4. AGREGAR COLUMNAS A TABLA ORDERS
-- =================================================================

-- Columna para información detallada de ubicación
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11, 8);

-- 5. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_primary ON user_addresses(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON user_addresses(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_addresses_location ON user_addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_addresses_verified ON user_addresses(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_addresses_type ON user_addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_user_addresses_city ON user_addresses(city);

CREATE INDEX IF NOT EXISTS idx_users_current_location ON users(current_latitude, current_longitude) WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_location_permission ON users(location_permission_granted) WHERE location_permission_granted = TRUE;

CREATE INDEX IF NOT EXISTS idx_location_verification_address ON location_verification_log(address_id);
CREATE INDEX IF NOT EXISTS idx_location_verification_user ON location_verification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_location_verification_status ON location_verification_log(verification_status);
CREATE INDEX IF NOT EXISTS idx_location_verification_date ON location_verification_log(created_at);

-- 6. FUNCIÓN PARA CALCULAR DISTANCIA
-- =================================================================

CREATE OR REPLACE FUNCTION calculate_distance_accurate(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    earth_radius CONSTANT DECIMAL := 6371000;
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlng := RADIANS(lng2 - lng1);
    
    a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng/2) * SIN(dlng/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCIÓN PARA ESTABLECER DIRECCIÓN PRIMARIA
-- =================================================================

CREATE OR REPLACE FUNCTION set_primary_address(user_uuid UUID, address_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    address_exists BOOLEAN;
    address_belongs_to_user BOOLEAN;
BEGIN
    -- Verificar que la dirección existe y pertenece al usuario
    SELECT 
        COUNT(*) > 0,
        COUNT(CASE WHEN user_id = user_uuid THEN 1 END) > 0
    INTO address_exists, address_belongs_to_user
    FROM user_addresses 
    WHERE id = address_uuid AND is_active = TRUE;
    
    IF NOT address_exists THEN
        RAISE EXCEPTION 'La dirección no existe o no está activa';
    END IF;
    
    IF NOT address_belongs_to_user THEN
        RAISE EXCEPTION 'La dirección no pertenece al usuario';
    END IF;
    
    -- Desmarcar otras direcciones como primarias
    UPDATE user_addresses 
    SET is_primary = FALSE, updated_at = NOW()
    WHERE user_id = user_uuid AND is_primary = TRUE;
    
    -- Marcar la nueva dirección como primaria
    UPDATE user_addresses 
    SET is_primary = TRUE, updated_at = NOW()
    WHERE id = address_uuid;
    
    -- Actualizar referencia en tabla users
    UPDATE users 
    SET primary_address_id = address_uuid, updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCIÓN PARA BUSCAR DIRECCIONES CERCANAS
-- =================================================================

CREATE OR REPLACE FUNCTION find_nearby_addresses(
    target_lat DECIMAL, 
    target_lng DECIMAL, 
    radius_meters INTEGER DEFAULT 100
)
RETURNS TABLE (
    address_id UUID,
    user_id UUID,
    label VARCHAR,
    address_line1 TEXT,
    distance_meters DECIMAL,
    delivery_instructions TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.id,
        ua.user_id,
        ua.label,
        ua.address_line1,
        calculate_distance_accurate(target_lat, target_lng, ua.latitude, ua.longitude) as distance_meters,
        ua.delivery_instructions
    FROM user_addresses ua
    WHERE ua.latitude IS NOT NULL 
      AND ua.longitude IS NOT NULL
      AND ua.is_active = TRUE
      AND calculate_distance_accurate(target_lat, target_lng, ua.latitude, ua.longitude) <= radius_meters
    ORDER BY distance_meters ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCIÓN PARA ACTUALIZAR ESTADÍSTICAS DE USO
-- =================================================================

CREATE OR REPLACE FUNCTION update_address_usage(address_uuid UUID, delivery_success BOOLEAN DEFAULT TRUE)
RETURNS VOID AS $$
BEGIN
    UPDATE user_addresses SET
        times_used = times_used + 1,
        last_used_at = NOW(),
        delivery_success_rate = CASE 
            WHEN delivery_success THEN 
                CASE 
                    WHEN times_used = 0 THEN 100.00
                    ELSE ((delivery_success_rate * times_used) + 100.0) / (times_used + 1)
                END
            ELSE 
                CASE 
                    WHEN times_used = 0 THEN 0.00
                    ELSE ((delivery_success_rate * times_used) + 0.0) / (times_used + 1)
                END
            END,
        updated_at = NOW()
    WHERE id = address_uuid;
END;
$$ LANGUAGE plpgsql;

-- 10. CREAR TRIGGERS
-- =================================================================

-- Trigger para updated_at en user_addresses
CREATE OR REPLACE FUNCTION update_address_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER trigger_user_addresses_updated_at
    BEFORE UPDATE ON user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_address_updated_at();

-- Trigger para crear primera dirección como primaria automáticamente
CREATE OR REPLACE FUNCTION set_first_address_as_primary()
RETURNS TRIGGER AS $$
DECLARE
    user_address_count INTEGER;
BEGIN
    -- Contar direcciones existentes del usuario
    SELECT COUNT(*) INTO user_address_count
    FROM user_addresses 
    WHERE user_id = NEW.user_id AND is_active = TRUE;
    
    -- Si es la primera dirección, marcarla como primaria
    IF user_address_count = 1 THEN
        NEW.is_primary = TRUE;
        
        -- Actualizar referencia en users
        UPDATE users 
        SET primary_address_id = NEW.id 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_first_address_primary ON user_addresses;
CREATE TRIGGER trigger_set_first_address_primary
    AFTER INSERT ON user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION set_first_address_as_primary();

-- 11. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =================================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_verification_log ENABLE ROW LEVEL SECURITY;

-- Políticas para user_addresses
DROP POLICY IF EXISTS "Users can view their own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Drivers can view delivery addresses" ON user_addresses;
DROP POLICY IF EXISTS "Admin can view all addresses" ON user_addresses;

CREATE POLICY "Users can view their own addresses" ON user_addresses
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own addresses" ON user_addresses
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Drivers can view delivery addresses" ON user_addresses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            INNER JOIN users d ON d.id = auth.uid() AND d.role = 'repartidor'
            WHERE o.driver_id = auth.uid() 
            AND (
                o.buyer_id = user_addresses.user_id OR
                o.pickup_address = user_addresses.address_line1 OR
                o.delivery_address = user_addresses.address_line1
            )
        )
    );

CREATE POLICY "Admin can view all addresses" ON user_addresses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = 'trato.app1984@gmail.com'
        )
    );

-- Políticas para location_verification_log
DROP POLICY IF EXISTS "Users can view their verification log" ON location_verification_log;
DROP POLICY IF EXISTS "System can insert verification records" ON location_verification_log;
DROP POLICY IF EXISTS "Admin can view all verification logs" ON location_verification_log;

CREATE POLICY "Users can view their verification log" ON location_verification_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert verification records" ON location_verification_log
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admin can view all verification logs" ON location_verification_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = 'trato.app1984@gmail.com'
        )
    );

-- 12. CREAR CONSTRAINTS
-- =================================================================

-- Constraint para una sola dirección primaria por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_primary_per_user
ON user_addresses (user_id) WHERE (is_primary = TRUE);

-- Foreign key para primary_address_id en users
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_primary_address 
FOREIGN KEY (primary_address_id) REFERENCES user_addresses(id) ON DELETE SET NULL;

-- 13. CREAR VISTAS ÚTILES
-- =================================================================

-- Vista para direcciones de usuario con detalles completos
CREATE OR REPLACE VIEW user_addresses_detailed AS
SELECT 
    ua.id,
    ua.user_id,
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone,
    ua.label,
    ua.address_line1,
    ua.address_line2,
    ua.city,
    ua.state,
    ua.country,
    ua.postal_code,
    ua.latitude,
    ua.longitude,
    ua.accuracy_meters,
    ua.google_place_id,
    ua.what3words,
    ua.delivery_instructions,
    ua.landmark,
    ua.access_notes,
    ua.is_verified,
    ua.is_primary,
    ua.is_active,
    ua.address_type,
    ua.building_type,
    ua.floor_number,
    ua.apartment_number,
    ua.available_from,
    ua.available_to,
    ua.available_days,
    ua.location_source,
    ua.verification_method,
    ua.verification_date,
    ua.times_used,
    ua.last_used_at,
    ua.delivery_success_rate,
    ua.created_at,
    ua.updated_at,
    -- Estadísticas de verificación
    (SELECT COUNT(*) FROM location_verification_log lvl 
     WHERE lvl.address_id = ua.id AND lvl.verification_status = 'verified') as verification_count,
    (SELECT MAX(created_at) FROM location_verification_log lvl 
     WHERE lvl.address_id = ua.id) as last_verification_date
FROM user_addresses ua
LEFT JOIN users u ON ua.user_id = u.id
WHERE ua.is_active = TRUE;

-- Vista para estadísticas de ubicación por usuario
CREATE OR REPLACE VIEW user_location_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.current_latitude,
    u.current_longitude,
    u.location_updated_at,
    u.location_permission_granted,
    COUNT(ua.id) as total_addresses,
    COUNT(CASE WHEN ua.is_verified THEN 1 END) as verified_addresses,
    COUNT(CASE WHEN ua.is_primary THEN 1 END) as primary_addresses,
    AVG(ua.delivery_success_rate) as avg_delivery_success_rate,
    SUM(ua.times_used) as total_address_usage,
    MAX(ua.last_used_at) as last_address_used_at
FROM users u
LEFT JOIN user_addresses ua ON u.id = ua.user_id AND ua.is_active = TRUE
WHERE u.role = 'comprador'
GROUP BY u.id, u.name, u.email, u.current_latitude, u.current_longitude, 
         u.location_updated_at, u.location_permission_granted;

-- 14. CONFIGURAR REALTIME
-- =================================================================

-- Nota: Estas líneas deben ejecutarse por separado si da error
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_addresses;
-- ALTER PUBLICATION supabase_realtime ADD TABLE location_verification_log;

-- 15. MENSAJE DE CONFIRMACIÓN
-- =================================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SISTEMA DE UBICACIONES - INSTALACIÓN COMPLETA';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SUCCESS: Sistema de ubicaciones instalado correctamente';
    RAISE NOTICE '✅ Tabla user_addresses creada';
    RAISE NOTICE '✅ Tabla location_verification_log creada';
    RAISE NOTICE '✅ Columnas agregadas a users y orders';
    RAISE NOTICE '✅ Índices de optimización creados';
    RAISE NOTICE '✅ Funciones de gestión creadas';
    RAISE NOTICE '✅ Triggers automáticos configurados';
    RAISE NOTICE '✅ Políticas de seguridad RLS aplicadas';
    RAISE NOTICE '✅ Vistas útiles creadas';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FUNCIONALIDADES DISPONIBLES:';
    RAISE NOTICE '1. Múltiples direcciones por usuario';
    RAISE NOTICE '2. Verificación automática con GPS';
    RAISE NOTICE '3. Instrucciones para repartidores';
    RAISE NOTICE '4. Estadísticas de entrega';
    RAISE NOTICE '5. Búsqueda de direcciones cercanas';
    RAISE NOTICE '==========================================';
END $$;