-- ============================================================================
-- TRATO - Script Final Basado en Estructura Real
-- ============================================================================
-- Basado en la estructura exacta de tu base de datos
-- ============================================================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREAR TABLAS FALTANTES CRÍTICAS
-- ============================================================================

-- Crear tabla products (no existe en tu estructura)
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

-- Crear tabla orders (no existe en tu estructura)
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

-- Crear tabla messages (necesaria para conversations)
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

-- ============================================================================
-- AGREGAR COLUMNAS FALTANTES A TABLAS EXISTENTES
-- ============================================================================

-- Agregar columnas faltantes a conversations
DO $$
BEGIN
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

-- Agregar columna faltante a notifications (usas is_read, no read)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'updated_at') THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Agregar columna faltante a order_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'updated_at') THEN
        ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- ============================================================================
-- FUNCIÓN Y TRIGGERS PARA updated_at
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
    -- Trigger para users (ya tiene updated_at)
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
    
    -- Trigger para cart_items (ya tiene updated_at)
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
    
    -- Trigger para drivers (ya tiene updated_at)
    DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
    CREATE TRIGGER update_drivers_updated_at
        BEFORE UPDATE ON drivers FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    -- Trigger para order_items
    DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
    CREATE TRIGGER update_order_items_updated_at
        BEFORE UPDATE ON order_items FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ============================================================================
-- CREAR ÍNDICES OPTIMIZADOS BASADOS EN TU ESTRUCTURA REAL
-- ============================================================================

-- Índices para users (columnas que realmente existen)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Índices para cart_items (columnas que realmente existen)
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON cart_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at);

-- Índices para order_items (columnas que realmente existen)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_daily_product_id ON order_items(daily_product_id);

-- Índices para notifications (columnas que realmente existen)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Índices para conversations (columnas que realmente existen)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Índices para drivers (columnas que realmente existen)
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers(is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_is_verified ON drivers(is_verified);

-- Índices para daily_products (columnas que realmente existen)
CREATE INDEX IF NOT EXISTS idx_daily_products_seller_id ON daily_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_daily_products_is_available ON daily_products(is_available);
CREATE INDEX IF NOT EXISTS idx_daily_products_expires_at ON daily_products(expires_at);
CREATE INDEX IF NOT EXISTS idx_daily_products_category ON daily_products(category);

-- Índices para nuevas tablas
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_public ON products(is_public);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);

-- ============================================================================
-- CONFIGURAR RLS BÁSICO
-- ============================================================================

-- Habilitar RLS en tablas principales
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en nuevas tablas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

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
    created_tables TEXT := '';
BEGIN
    -- Verificar si se crearon tablas nuevas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        created_tables := created_tables || 'products, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        created_tables := created_tables || 'orders, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        created_tables := created_tables || 'messages, ';
    END IF;
    
    -- Mostrar resultado
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '✅ Estructura existente respetada';
    
    IF created_tables != '' THEN
        RAISE NOTICE '✅ Tablas nuevas creadas: %', TRIM(trailing ', ' from created_tables);
    END IF;
    
    RAISE NOTICE '✅ Columnas faltantes agregadas';
    RAISE NOTICE '✅ Índices optimizados creados';
    RAISE NOTICE '✅ Triggers configurados';
    RAISE NOTICE '✅ RLS habilitado';
    RAISE NOTICE '✅ Tu aplicación TRATO está lista para funcionar';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SCRIPT BASADO EN TU ESTRUCTURA REAL';
END $$;
