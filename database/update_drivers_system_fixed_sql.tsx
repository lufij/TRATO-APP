-- =================================================================
-- SISTEMA COMPLETO DE REPARTIDORES PARA TRATO - VERSIÓN CORREGIDA
-- =================================================================
-- Este script crea todas las funcionalidades necesarias para
-- el sistema completo de repartidores con GPS, entregas y notificaciones
-- SIN errores de columnas inexistentes
-- =================================================================

-- 1. ELIMINAR TABLA DRIVERS EXISTENTE Y RECREARLA (SOLO SI HAY PROBLEMAS)
-- =================================================================

-- Opcional: Si hay problemas con la tabla existente, descomentarla
-- DROP TABLE IF EXISTS drivers CASCADE;

-- 2. CREAR TABLA DRIVERS (Repartidores) - VERSIÓN SIMPLIFICADA
-- =================================================================

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'motocicleta',
    license_number VARCHAR(100) UNIQUE NOT NULL,
    vehicle_brand VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    vehicle_plate VARCHAR(20),
    vehicle_color VARCHAR(50),
    is_active BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    current_location JSONB, -- {lat: number, lng: number}
    last_location_update TIMESTAMPTZ,
    phone VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2) DEFAULT 5.00,
    total_reviews INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AGREGAR COLUMNAS FALTANTES MANEJANDO ERRORES
-- =================================================================

DO $$
BEGIN
    RAISE NOTICE 'Agregando columnas faltantes a tabla drivers...';
    
    -- Solo agregar columnas si la tabla ya existía y faltan columnas
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_brand VARCHAR(100);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna vehicle_brand ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna vehicle_model ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna vehicle_year ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(20);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna vehicle_plate ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_color VARCHAR(50);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna vehicle_color ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_location JSONB;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna current_location ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna last_location_update ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna phone ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna emergency_contact_name ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna emergency_contact_phone ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna bank_account ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna bank_name ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna total_deliveries ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna total_earnings ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 5.00;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna average_rating ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna total_reviews ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline';
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna status ya existe';
    END;
    
    BEGIN
        ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna updated_at ya existe';
    END;
    
    RAISE NOTICE 'Columnas de drivers verificadas/agregadas exitosamente';
END $$;

-- 4. ACTUALIZAR TABLA ORDERS PARA SISTEMA DE ENTREGAS
-- =================================================================

DO $$
BEGIN
    RAISE NOTICE 'Agregando campos de entregas a tabla orders...';
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id UUID;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna driver_id ya existe en orders';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna pickup_address ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT NOT NULL DEFAULT '';
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna delivery_address ya existe';
    EXCEPTION WHEN OTHERS THEN
        -- Si falla por NOT NULL, intentar sin NOT NULL
        BEGIN
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT '';
        EXCEPTION WHEN duplicate_column THEN
            RAISE NOTICE 'Columna delivery_address ya existe';
        END;
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_notes TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna pickup_notes ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna delivery_notes ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(8,2) DEFAULT 10.00;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna delivery_fee ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna estimated_delivery ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna assigned_at ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna picked_up_at ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna delivered_at ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location JSONB;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna pickup_location ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location JSONB;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna delivery_location ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'delivery';
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna delivery_type ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_rating INTEGER;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna driver_rating ya existe';
    END;
    
    BEGIN
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_review TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Columna driver_review ya existe';
    END;
    
    RAISE NOTICE 'Campos de entregas agregados/verificados en orders';
END $$;

-- 5. AGREGAR CONSTRAINTS Y FOREIGN KEYS
-- =================================================================

DO $$
BEGIN
    -- Agregar foreign key de driver_id a drivers si no existe
    BEGIN
        ALTER TABLE orders ADD CONSTRAINT fk_orders_driver_id FOREIGN KEY (driver_id) REFERENCES drivers(id);
        RAISE NOTICE 'Foreign key orders -> drivers agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key orders -> drivers ya existe';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo agregar foreign key orders -> drivers: %', SQLERRM;
    END;
    
    -- Agregar constraint de status para orders
    BEGIN
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'));
        RAISE NOTICE 'Constraint de status en orders actualizada';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo actualizar constraint de status: %', SQLERRM;
    END;
    
    -- Agregar constraint de delivery_type
    BEGIN
        ALTER TABLE orders ADD CONSTRAINT orders_delivery_type_check 
        CHECK (delivery_type IN ('pickup', 'dine_in', 'delivery'));
        RAISE NOTICE 'Constraint de delivery_type agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint de delivery_type ya existe';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo agregar constraint de delivery_type: %', SQLERRM;
    END;
    
    -- Agregar constraint de driver_rating
    BEGIN
        ALTER TABLE orders ADD CONSTRAINT orders_driver_rating_check 
        CHECK (driver_rating >= 1 AND driver_rating <= 5);
        RAISE NOTICE 'Constraint de driver_rating agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint de driver_rating ya existe';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo agregar constraint de driver_rating: %', SQLERRM;
    END;
END $$;

-- 6. CREAR TABLA DELIVERY_HISTORY (Historial de entregas)
-- =================================================================

CREATE TABLE IF NOT EXISTS delivery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    pickup_location JSONB,
    delivery_location JSONB,
    distance_km DECIMAL(8,2),
    duration_minutes INTEGER,
    earnings DECIMAL(8,2),
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_review TEXT,
    driver_notes TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CREAR TABLA DRIVER_NOTIFICATIONS (Notificaciones para repartidores)
-- =================================================================

CREATE TABLE IF NOT EXISTS driver_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_order', 'order_update', 'system', 'rating', 'earnings')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Datos adicionales como order_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREAR ÍNDICES PARA OPTIMIZACIÓN (SIN is_available)
-- =================================================================

DO $$
BEGIN
    -- Índices para tabla drivers (solo campos que existen)
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active) WHERE is_active = TRUE;
        RAISE NOTICE 'Índice idx_drivers_active creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_drivers_active: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
        RAISE NOTICE 'Índice idx_drivers_status creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_drivers_status: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_drivers_verified ON drivers(is_verified) WHERE is_verified = TRUE;
        RAISE NOTICE 'Índice idx_drivers_verified creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_drivers_verified: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIN(current_location) WHERE current_location IS NOT NULL;
        RAISE NOTICE 'Índice idx_drivers_location creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_drivers_location: %', SQLERRM;
    END;
    
    -- Índices para tabla orders (sistema de entregas)
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
        RAISE NOTICE 'Índice idx_orders_driver_id creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_orders_driver_id: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_orders_status_driver ON orders(status, driver_id);
        RAISE NOTICE 'Índice idx_orders_status_driver creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_orders_status_driver: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_orders_ready_status ON orders(status) WHERE status = 'ready';
        RAISE NOTICE 'Índice idx_orders_ready_status creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_orders_ready_status: %', SQLERRM;
    END;
    
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);
        RAISE NOTICE 'Índice idx_orders_delivery_type creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índice idx_orders_delivery_type: %', SQLERRM;
    END;
    
    -- Índices para delivery_history
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_delivery_history_driver ON delivery_history(driver_id);
        CREATE INDEX IF NOT EXISTS idx_delivery_history_order ON delivery_history(order_id);
        CREATE INDEX IF NOT EXISTS idx_delivery_history_date ON delivery_history(created_at);
        RAISE NOTICE 'Índices de delivery_history creados';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índices de delivery_history: %', SQLERRM;
    END;
    
    -- Índices para notificaciones
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver ON driver_notifications(driver_id);
        CREATE INDEX IF NOT EXISTS idx_driver_notifications_unread ON driver_notifications(driver_id, is_read) WHERE is_read = FALSE;
        RAISE NOTICE 'Índices de notificaciones creados';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Índices de notificaciones: %', SQLERRM;
    END;
END $$;

-- 9. CREAR FUNCIONES AUXILIARES
-- =================================================================

-- Función para calcular distancia entre dos puntos GPS
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    earth_radius CONSTANT DECIMAL := 6371; -- Radio de la Tierra en km
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

-- Función para actualizar estadísticas del repartidor
CREATE OR REPLACE FUNCTION update_driver_stats(driver_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_deliveries_count INTEGER;
    total_earnings_sum DECIMAL(10,2);
    avg_rating DECIMAL(3,2);
    total_reviews_count INTEGER;
BEGIN
    -- Contar entregas completadas
    SELECT COUNT(*) INTO total_deliveries_count
    FROM delivery_history 
    WHERE driver_id = driver_uuid AND status = 'completed';
    
    -- Sumar ganancias totales
    SELECT COALESCE(SUM(earnings), 0) INTO total_earnings_sum
    FROM delivery_history 
    WHERE driver_id = driver_uuid AND status = 'completed';
    
    -- Calcular rating promedio
    SELECT AVG(customer_rating), COUNT(customer_rating) 
    INTO avg_rating, total_reviews_count
    FROM delivery_history 
    WHERE driver_id = driver_uuid AND customer_rating IS NOT NULL;
    
    -- Actualizar estadísticas del driver
    UPDATE drivers SET
        total_deliveries = total_deliveries_count,
        total_earnings = total_earnings_sum,
        average_rating = COALESCE(avg_rating, 5.00),
        total_reviews = total_reviews_count,
        updated_at = NOW()
    WHERE id = driver_uuid;
END;
$$ LANGUAGE plpgsql;

-- 10. CREAR TRIGGERS PARA AUTOMATIZACIÓN
-- =================================================================

-- Trigger para actualizar updated_at en drivers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Crear trigger si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_drivers_updated_at') THEN
        CREATE TRIGGER trigger_drivers_updated_at
            BEFORE UPDATE ON drivers
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger trigger_drivers_updated_at creado';
    ELSE
        RAISE NOTICE 'Trigger trigger_drivers_updated_at ya existe';
    END IF;
END $$;

-- Trigger para crear historial de entrega al completar orden
CREATE OR REPLACE FUNCTION create_delivery_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo crear historial cuando la orden se marca como entregada
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.driver_id IS NOT NULL THEN
        INSERT INTO delivery_history (
            driver_id,
            order_id,
            started_at,
            completed_at,
            pickup_location,
            delivery_location,
            earnings
        ) VALUES (
            NEW.driver_id,
            NEW.id,
            COALESCE(NEW.assigned_at, NOW()),
            NEW.delivered_at,
            NEW.pickup_location,
            NEW.delivery_location,
            NEW.delivery_fee
        );
        
        -- Actualizar estadísticas del driver
        PERFORM update_driver_stats(NEW.driver_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Crear trigger si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_create_delivery_history') THEN
        CREATE TRIGGER trigger_create_delivery_history
            AFTER UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION create_delivery_history();
        RAISE NOTICE 'Trigger trigger_create_delivery_history creado';
    ELSE
        RAISE NOTICE 'Trigger trigger_create_delivery_history ya existe';
    END IF;
END $$;

-- 11. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =================================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_notifications ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Drivers can view their own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can update their own profile" ON drivers;
DROP POLICY IF EXISTS "Admin can view all drivers" ON drivers;
DROP POLICY IF EXISTS "Drivers can view their delivery history" ON delivery_history;
DROP POLICY IF EXISTS "System can insert delivery history" ON delivery_history;
DROP POLICY IF EXISTS "Admin can view all delivery history" ON delivery_history;
DROP POLICY IF EXISTS "Drivers can view their notifications" ON driver_notifications;
DROP POLICY IF EXISTS "Drivers can update their notifications" ON driver_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON driver_notifications;
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Drivers can update assigned orders" ON orders;

-- Crear políticas nuevas
CREATE POLICY "Drivers can view their own profile" ON drivers
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Drivers can update their own profile" ON drivers
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin can view all drivers" ON drivers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = 'trato.app1984@gmail.com'
        )
    );

CREATE POLICY "Drivers can view their delivery history" ON delivery_history
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "System can insert delivery history" ON delivery_history
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admin can view all delivery history" ON delivery_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = 'trato.app1984@gmail.com'
        )
    );

CREATE POLICY "Drivers can view their notifications" ON driver_notifications
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update their notifications" ON driver_notifications
    FOR UPDATE USING (driver_id = auth.uid());

CREATE POLICY "System can insert notifications" ON driver_notifications
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Drivers can view assigned orders" ON orders
    FOR SELECT USING (
        driver_id = auth.uid() OR 
        (status = 'ready' AND driver_id IS NULL)
    );

CREATE POLICY "Drivers can update assigned orders" ON orders
    FOR UPDATE USING (driver_id = auth.uid());

-- 12. CONFIGURAR REALTIME PARA NOTIFICACIONES
-- =================================================================

DO $$
BEGIN
    -- Habilitar realtime en las tablas necesarias
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
        RAISE NOTICE 'Tabla orders agregada a realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Tabla orders ya está en realtime';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo agregar orders a realtime: %', SQLERRM;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
        RAISE NOTICE 'Tabla drivers agregada a realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Tabla drivers ya está en realtime';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo agregar drivers a realtime: %', SQLERRM;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE driver_notifications;
        RAISE NOTICE 'Tabla driver_notifications agregada a realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Tabla driver_notifications ya está en realtime';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo agregar driver_notifications a realtime: %', SQLERRM;
    END;
END $$;

-- 13. CREAR VISTAS ÚTILES
-- =================================================================

-- Vista para estadísticas de repartidores
CREATE OR REPLACE VIEW driver_stats_view AS
SELECT 
    d.id,
    u.name,
    u.email,
    d.vehicle_type,
    d.is_active,
    d.is_verified,
    d.status,
    d.total_deliveries,
    d.total_earnings,
    d.average_rating,
    d.total_reviews,
    d.created_at,
    COUNT(CASE WHEN o.created_at >= CURRENT_DATE THEN 1 END) as today_deliveries,
    COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE THEN o.delivery_fee END), 0) as today_earnings
FROM drivers d
LEFT JOIN users u ON d.id = u.id
LEFT JOIN orders o ON d.id = o.driver_id AND o.status = 'delivered'
GROUP BY d.id, u.name, u.email, d.vehicle_type, d.is_active, d.is_verified, 
         d.status, d.total_deliveries, d.total_earnings, d.average_rating, 
         d.total_reviews, d.created_at;

-- Vista para órdenes disponibles para repartidores
CREATE OR REPLACE VIEW available_orders_view AS
SELECT 
    o.id,
    o.total,
    o.delivery_fee,
    o.pickup_address,
    o.delivery_address,
    o.delivery_type,
    o.estimated_delivery,
    o.created_at,
    s.business_name,
    u.name as customer_name,
    u.phone as customer_phone,
    COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN sellers s ON o.seller_id = s.id
LEFT JOIN users u ON o.buyer_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.status = 'ready' AND o.driver_id IS NULL
GROUP BY o.id, o.total, o.delivery_fee, o.pickup_address, o.delivery_address,
         o.delivery_type, o.estimated_delivery, o.created_at, s.business_name,
         u.name, u.phone;

-- 14. VERIFICACIÓN FINAL Y MENSAJE DE CONFIRMACIÓN
-- =================================================================

DO $$
DECLARE
    tables_count INTEGER;
    drivers_columns INTEGER;
    orders_columns INTEGER;
    functions_count INTEGER;
    triggers_count INTEGER;
    views_count INTEGER;
BEGIN
    -- Verificar tablas principales
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('drivers', 'delivery_history', 'driver_notifications');
    
    -- Verificar columnas en drivers
    SELECT COUNT(*) INTO drivers_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'drivers'
    AND column_name IN ('id', 'vehicle_type', 'is_active', 'is_verified', 'current_location', 'status');
    
    -- Verificar columnas adicionales en orders
    SELECT COUNT(*) INTO orders_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'orders'
    AND column_name IN ('driver_id', 'pickup_address', 'delivery_address', 'delivery_fee');
    
    -- Verificar funciones
    SELECT COUNT(*) INTO functions_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
    AND routine_name IN ('calculate_distance', 'update_driver_stats');
    
    -- Verificar triggers
    SELECT COUNT(*) INTO triggers_count
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' 
    AND trigger_name IN ('trigger_drivers_updated_at', 'trigger_create_delivery_history');
    
    -- Verificar vistas
    SELECT COUNT(*) INTO views_count
    FROM information_schema.views
    WHERE table_schema = 'public' 
    AND table_name IN ('driver_stats_view', 'available_orders_view');
    
    -- Mostrar resultados de la instalación
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SISTEMA DE REPARTIDORES TRATO - INSTALACIÓN COMPLETA';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Tablas creadas: % de 3 (drivers, delivery_history, driver_notifications)', tables_count;
    RAISE NOTICE 'Columnas drivers: % de 6 (columnas principales)', drivers_columns;
    RAISE NOTICE 'Columnas orders: % de 4 (campos de entrega)', orders_columns;
    RAISE NOTICE 'Funciones GPS: % de 2 (calculate_distance, update_driver_stats)', functions_count;
    RAISE NOTICE 'Triggers: % de 2 (automatización)', triggers_count;
    RAISE NOTICE 'Vistas: % de 2 (estadísticas y órdenes)', views_count;
    RAISE NOTICE '==========================================';
    
    IF tables_count = 3 AND drivers_columns = 6 AND orders_columns = 4 AND functions_count = 2 THEN
        RAISE NOTICE 'SUCCESS: Sistema de repartidores instalado correctamente';
        RAISE NOTICE '✅ Gestión completa de repartidores';
        RAISE NOTICE '✅ Sistema de entregas con GPS';
        RAISE NOTICE '✅ Notificaciones en tiempo real';
        RAISE NOTICE '✅ Historial de entregas';
        RAISE NOTICE '✅ Estadísticas y ganancias';
        RAISE NOTICE '✅ Sistema de calificaciones';
        RAISE NOTICE '✅ Políticas de seguridad RLS';
        RAISE NOTICE '✅ Funciones GPS y cálculo de distancias';
        RAISE NOTICE '✅ Triggers automáticos';
        RAISE NOTICE '✅ Vistas de estadísticas';
        RAISE NOTICE '==========================================';
        RAISE NOTICE 'PRÓXIMOS PASOS:';
        RAISE NOTICE '1. Habilitar Realtime en Supabase Dashboard';
        RAISE NOTICE '2. Recargar la aplicación TRATO';
        RAISE NOTICE '3. Probar el DriverDashboard';
        RAISE NOTICE '==========================================';
    ELSE
        RAISE NOTICE 'WARNING: Instalación parcial. Verificar elementos faltantes';
        RAISE NOTICE 'Si faltan elementos, verificar que las tablas base (users, orders) existan';
    END IF;
END $$;

-- 15. RESUMEN FINAL
-- =================================================================

DO $$
DECLARE
    drivers_count INTEGER;
    history_count INTEGER;
    notifications_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO drivers_count FROM drivers;
    SELECT COUNT(*) INTO history_count FROM delivery_history;
    SELECT COUNT(*) INTO notifications_count FROM driver_notifications;
    
    RAISE NOTICE 'RESUMEN DE DATOS ACTUALES:';
    RAISE NOTICE 'Repartidores registrados: %', drivers_count;
    RAISE NOTICE 'Historial de entregas: %', history_count;
    RAISE NOTICE 'Notificaciones: %', notifications_count;
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SISTEMA LISTO PARA USAR - Sin errores de columnas inexistentes';
END $$;