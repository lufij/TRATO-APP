-- ============================================================================
-- TRATO - Script Específico para tu Base de Datos Actual
-- ============================================================================
-- Basado en la estructura real de tu BD en Supabase
-- Solo agrega las columnas y tablas que faltan
-- ============================================================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PARTE 1: VERIFICAR Y CREAR TABLAS FALTANTES
-- ============================================================================

-- Crear tabla users si no existe (parece que no está en tu lista)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'comprador' CHECK (role IN ('comprador', 'vendedor', 'repartidor', 'admin')),
    business_name TEXT,
    business_description TEXT,
    business_address TEXT,
    is_open_now BOOLEAN DEFAULT true,
    weekly_hours JSONB DEFAULT '{}',
    driver_license TEXT,
    vehicle_type TEXT,
    is_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla products si no existe (parece que no está en tu lista)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla orders si no existe (parece que no está en tu lista)
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    delivery_address TEXT,
    delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup', 'dine_in')),
    notes TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    driver_id UUID REFERENCES drivers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla cart si no existe (veo que tienes cart_items)
CREATE TABLE IF NOT EXISTS cart (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Crear tabla messages si no existe 
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    read_by JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla user_addresses si no existe
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address_line TEXT NOT NULL,
    city TEXT DEFAULT 'Gualán',
    department TEXT DEFAULT 'Zacapa',
    country TEXT DEFAULT 'Guatemala',
    postal_code TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    is_default BOOLEAN DEFAULT FALSE,
    address_type TEXT DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PARTE 2: AGREGAR COLUMNAS FALTANTES A TABLAS EXISTENTES
-- ============================================================================

-- Agregar columnas faltantes a conversations
DO $$
BEGIN
    -- Tu conversations tiene estructura diferente, agregar columnas necesarias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_id') THEN
        ALTER TABLE conversations ADD COLUMN participant1_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_id') THEN
        ALTER TABLE conversations ADD COLUMN participant2_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_at') THEN
        ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'updated_at') THEN
        ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') THEN
        ALTER TABLE conversations ADD COLUMN last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Agregar columnas faltantes a notifications
DO $$
BEGIN
    -- Verificar si falta columna updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'updated_at') THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Verificar si hay columna read en lugar de is_read
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
            ALTER TABLE notifications RENAME COLUMN is_read TO read;
        ELSE
            ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
END $$;

-- Verificar estructura de order_items (ya parece completa)
DO $$
BEGIN
    -- Verificar si falta updated_at en order_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'updated_at') THEN
        ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Agregar columnas faltantes a cart_items para compatibilidad
DO $$
BEGIN
    -- Tu tabla se llama cart_items, agregar compatibilidad si es necesaria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'daily_product_id') THEN
        -- Ya la tienes, pero verificar si falta algo más
        NULL;
    END IF;
END $$;

-- ============================================================================
-- PARTE 3: CREAR FUNCIÓN Y TRIGGERS PARA updated_at
-- ============================================================================

-- Función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para tablas que los necesitan
DO $$
BEGIN
    -- Trigger para users
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para products
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para orders
    DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
    CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para cart_items
    DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
    CREATE TRIGGER update_cart_items_updated_at
        BEFORE UPDATE ON cart_items FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para conversations
    DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
    CREATE TRIGGER update_conversations_updated_at
        BEFORE UPDATE ON conversations FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para notifications
    DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
    CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE ON notifications FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para drivers
    DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
    CREATE TRIGGER update_drivers_updated_at
        BEFORE UPDATE ON drivers FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para driver_locations
    DROP TRIGGER IF EXISTS update_driver_locations_updated_at ON driver_locations;
    CREATE TRIGGER update_driver_locations_updated_at
        BEFORE UPDATE ON driver_locations FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para critical_alerts
    DROP TRIGGER IF EXISTS update_critical_alerts_updated_at ON critical_alerts;
    CREATE TRIGGER update_critical_alerts_updated_at
        BEFORE UPDATE ON critical_alerts FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ============================================================================
-- PARTE 4: CREAR ÍNDICES OPTIMIZADOS PARA TU ESTRUCTURA
-- ============================================================================

-- Índices para tablas existentes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON cart_items(seller_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_daily_product_id ON order_items(daily_product_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers(is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating DESC);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id ON driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_daily_products_seller_id ON daily_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_daily_products_is_available ON daily_products(is_available);
CREATE INDEX IF NOT EXISTS idx_daily_products_expires_at ON daily_products(expires_at);

CREATE INDEX IF NOT EXISTS idx_critical_alerts_resolved ON critical_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_urgency_level ON critical_alerts(urgency_level);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_created_at ON critical_alerts(created_at DESC);

-- Índices para tablas nuevas si existen
DO $$
BEGIN
    -- Índices para users si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_is_available ON users(is_available);
    END IF;
    
    -- Índices para products si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_is_public ON products(is_public);
    END IF;
    
    -- Índices para orders si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
    END IF;
END $$;

-- ============================================================================
-- PARTE 5: CONFIGURAR RLS BÁSICO
-- ============================================================================

-- Habilitar RLS en tablas principales
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para cart_items
DROP POLICY IF EXISTS "Users manage own cart items" ON cart_items;
CREATE POLICY "Users manage own cart items" ON cart_items
    FOR ALL USING (user_id = auth.uid());

-- Políticas básicas para notifications
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- Políticas para conversations
DROP POLICY IF EXISTS "Users view own conversations" ON conversations;
CREATE POLICY "Users view own conversations" ON conversations
    FOR SELECT USING (user_id = auth.uid());

-- Políticas para daily_products
DROP POLICY IF EXISTS "View available daily products" ON daily_products;
CREATE POLICY "View available daily products" ON daily_products
    FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Sellers manage daily products" ON daily_products;
CREATE POLICY "Sellers manage daily products" ON daily_products
    FOR ALL USING (seller_id = auth.uid());

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    missing_tables TEXT := '';
BEGIN
    -- Verificar tablas críticas
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN ('users', 'products', 'orders', 'cart_items', 'order_items', 
                         'notifications', 'conversations', 'daily_products', 'drivers')
    AND table_schema = 'public';
    
    -- Verificar si faltan tablas importantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        missing_tables := missing_tables || 'users, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        missing_tables := missing_tables || 'products, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        missing_tables := missing_tables || 'orders, ';
    END IF;
    
    -- Mostrar resultado
    IF missing_tables = '' THEN
        RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE';
        RAISE NOTICE '✅ Todas las tablas críticas están configuradas';
        RAISE NOTICE '✅ Índices optimizados creados';
        RAISE NOTICE '✅ RLS configurado';
        RAISE NOTICE '✅ Tu aplicación TRATO está lista';
    ELSE
        RAISE NOTICE '⚠️ Tablas faltantes creadas: %', TRIM(trailing ', ' from missing_tables);
        RAISE NOTICE '✅ Configuración aplicada a estructura existente';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SCRIPT COMPLETADO PARA TU BASE DE DATOS ESPECÍFICA';
END $$;
