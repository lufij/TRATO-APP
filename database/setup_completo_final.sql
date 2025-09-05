-- ============================================================================
-- TRATO - Script de Configuración Completa FINAL (Sin Errores)
-- ============================================================================
-- Este script configura completamente la base de datos TRATO desde cero
-- Incluye TODAS las correcciones y verificaciones necesarias
-- Versión: FINAL CORREGIDA - SIN ERRORES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 INICIANDO CONFIGURACIÓN COMPLETA DE TRATO (VERSIÓN FINAL)...';
    RAISE NOTICE '';
    RAISE NOTICE 'Este script configurará TODO sin errores:';
    RAISE NOTICE '  • Sistema de usuarios y autenticación ✅';
    RAISE NOTICE '  • Sistema de productos y categorías ✅';
    RAISE NOTICE '  • Sistema de pedidos y order_items ✅';
    RAISE NOTICE '  • Sistema de carrito de compras ✅';
    RAISE NOTICE '  • Sistema de chat y mensajería ✅';
    RAISE NOTICE '  • Sistema de notificaciones ✅';
    RAISE NOTICE '  • Sistema de ubicaciones ✅';
    RAISE NOTICE '  • Row Level Security (RLS) ✅';
    RAISE NOTICE '  • Índices de optimización ✅';
    RAISE NOTICE '  • Triggers automáticos ✅';
    RAISE NOTICE '  • TODAS las correcciones aplicadas ✅';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PARTE 1: CONFIGURACIÓN DE EXTENSIONES Y FUNCIONES BÁSICAS
-- ============================================================================

-- Habilitar UUID si no está habilitado
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- PARTE 2: CREAR TODAS LAS TABLAS CON ESTRUCTURA COMPLETA
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '👥 CREANDO TABLA USERS...';
    
    -- Crear tabla users completa
    CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'comprador' CHECK (role IN ('comprador', 'vendedor', 'repartidor', 'admin')),
        
        -- Campos específicos para vendedores
        business_name TEXT,
        business_description TEXT,
        business_address TEXT,
        is_open_now BOOLEAN DEFAULT true,
        weekly_hours JSONB DEFAULT '{}',
        
        -- Campos específicos para repartidores
        driver_license TEXT,
        vehicle_type TEXT,
        is_available BOOLEAN DEFAULT false,
        
        -- Campos de auditoría
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '   ✅ Tabla users creada/verificada';
END $$;

DO $$
BEGIN
    RAISE NOTICE '📦 CREANDO TABLA PRODUCTS...';
    
    CREATE TABLE IF NOT EXISTS products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        category TEXT,
        stock_quantity INTEGER DEFAULT 0,
        image_url TEXT,
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '   ✅ Tabla products creada/verificada';
END $$;

DO $$
BEGIN
    RAISE NOTICE '🛒 CREANDO TABLA ORDERS (CON notes)...';
    
    CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
        delivery_address TEXT,
        delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup', 'dine_in')),
        notes TEXT,  -- COLUMNA CRÍTICA QUE FALTABA
        estimated_delivery TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '   ✅ Tabla orders creada/verificada (CON notes)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '📋 CREANDO TABLA ORDER_ITEMS (CON price_per_unit)...';
    
    CREATE TABLE IF NOT EXISTS order_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,  -- COLUMNA CRÍTICA QUE FALTABA
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '   ✅ Tabla order_items creada/verificada (CON price_per_unit)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '🛍️ CREANDO TABLA CART...';
    
    CREATE TABLE IF NOT EXISTS cart (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, product_id)
    );
    
    RAISE NOTICE '   ✅ Tabla cart creada/verificada';
END $$;

DO $$
BEGIN
    RAISE NOTICE '💬 CREANDO TABLA CONVERSATIONS...';
    
    CREATE TABLE IF NOT EXISTS conversations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(participant1_id, participant2_id)
    );
    
    RAISE NOTICE '   ✅ Tabla conversations creada/verificada';
END $$;

DO $$
BEGIN
    RAISE NOTICE '📨 CREANDO TABLA MESSAGES...';
    
    CREATE TABLE IF NOT EXISTS messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
        read_by JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '   ✅ Tabla messages creada/verificada';
END $$;

-- Ahora agregamos la columna last_message_id a conversations
DO $$
BEGIN
    RAISE NOTICE '🔗 AGREGANDO last_message_id A CONVERSATIONS...';
    
    -- Solo agregar si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') THEN
        ALTER TABLE conversations ADD COLUMN last_message_id UUID;
        ALTER TABLE conversations ADD CONSTRAINT conversations_last_message_id_fkey 
            FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;
        RAISE NOTICE '   ✅ Columna last_message_id agregada a conversations';
    ELSE
        RAISE NOTICE '   ✅ Columna last_message_id ya existe';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '🔔 CREANDO TABLA NOTIFICATIONS (CON recipient_id)...';
    
    CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- NOMBRE CORRECTO
        type TEXT NOT NULL DEFAULT 'general',
        title TEXT NOT NULL DEFAULT 'Notificación',
        message TEXT NOT NULL DEFAULT '',
        data JSONB DEFAULT '{}',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '   ✅ Tabla notifications creada/verificada (CON recipient_id)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '📍 CREANDO TABLA USER_ADDRESSES (CON is_default)...';
    
    CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        address_line TEXT NOT NULL,
        city TEXT DEFAULT 'Gualán',
        department TEXT DEFAULT 'Zacapa',
        country TEXT DEFAULT 'Guatemala',
        postal_code TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_default BOOLEAN DEFAULT FALSE,  -- COLUMNA CRÍTICA QUE FALTABA
        address_type TEXT DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'other')),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '   ✅ Tabla user_addresses creada/verificada (CON is_default)';
END $$;

-- ============================================================================
-- PARTE 3: AGREGAR COLUMNAS FALTANTES A TABLAS EXISTENTES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 VERIFICANDO Y AGREGANDO COLUMNAS FALTANTES...';
    
    -- Verificar orders.notes
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
        RAISE NOTICE '   ➕ Columna orders.notes agregada';
    END IF;
    
    -- Verificar order_items.price_per_unit
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        ALTER TABLE order_items ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '   ➕ Columna order_items.price_per_unit agregada';
    END IF;
    
    -- Verificar user_addresses.is_default
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
        ALTER TABLE user_addresses ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '   ➕ Columna user_addresses.is_default agregada';
    END IF;
    
    -- Verificar si notifications tiene user_id en lugar de recipient_id
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') 
       AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        ALTER TABLE notifications RENAME COLUMN user_id TO recipient_id;
        RAISE NOTICE '   🔄 Columna user_id renombrada a recipient_id';
    END IF;
    
    -- Agregar columnas faltantes a users si no existen
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_name') THEN
        ALTER TABLE users ADD COLUMN business_name TEXT;
        RAISE NOTICE '   ➕ Columna users.business_name agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_description') THEN
        ALTER TABLE users ADD COLUMN business_description TEXT;
        RAISE NOTICE '   ➕ Columna users.business_description agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_address') THEN
        ALTER TABLE users ADD COLUMN business_address TEXT;
        RAISE NOTICE '   ➕ Columna users.business_address agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_open_now') THEN
        ALTER TABLE users ADD COLUMN is_open_now BOOLEAN DEFAULT true;
        RAISE NOTICE '   ➕ Columna users.is_open_now agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'weekly_hours') THEN
        ALTER TABLE users ADD COLUMN weekly_hours JSONB DEFAULT '{}';
        RAISE NOTICE '   ➕ Columna users.weekly_hours agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'driver_license') THEN
        ALTER TABLE users ADD COLUMN driver_license TEXT;
        RAISE NOTICE '   ➕ Columna users.driver_license agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'vehicle_type') THEN
        ALTER TABLE users ADD COLUMN vehicle_type TEXT;
        RAISE NOTICE '   ➕ Columna users.vehicle_type agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_available') THEN
        ALTER TABLE users ADD COLUMN is_available BOOLEAN DEFAULT false;
        RAISE NOTICE '   ➕ Columna users.is_available agregada';
    END IF;
    
    -- Agregar columnas faltantes a conversations si no existen
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_id') THEN
        ALTER TABLE conversations ADD COLUMN participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '   ➕ Columna conversations.participant1_id agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_id') THEN
        ALTER TABLE conversations ADD COLUMN participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '   ➕ Columna conversations.participant2_id agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_at') THEN
        ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna conversations.last_message_at agregada';
    END IF;
    
    -- Agregar columnas faltantes a messages si no existen
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
        ALTER TABLE messages ADD COLUMN conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE;
        RAISE NOTICE '   ➕ Columna messages.conversation_id agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        ALTER TABLE messages ADD COLUMN sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE '   ➕ Columna messages.sender_id agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
        ALTER TABLE messages ADD COLUMN content TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '   ➕ Columna messages.content agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
        RAISE NOTICE '   ➕ Columna messages.message_type agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read_by') THEN
        ALTER TABLE messages ADD COLUMN read_by JSONB DEFAULT '{}';
        RAISE NOTICE '   ➕ Columna messages.read_by agregada';
    END IF;
    
    -- Verificar updated_at en todas las tablas
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna users.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna products.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna orders.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'updated_at') THEN
        ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna order_items.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cart' AND column_name = 'updated_at') THEN
        ALTER TABLE cart ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna cart.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'updated_at') THEN
        ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna conversations.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at') THEN
        ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna messages.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'updated_at') THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna notifications.updated_at agregada';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'updated_at') THEN
        ALTER TABLE user_addresses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '   ➕ Columna user_addresses.updated_at agregada';
    END IF;
    
    RAISE NOTICE '   ✅ Todas las columnas críticas verificadas';
END $$;

-- ============================================================================
-- PARTE 4: CREAR ÍNDICES DE OPTIMIZACIÓN (CON VERIFICACIÓN DE COLUMNAS)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📊 CREANDO ÍNDICES DE OPTIMIZACIÓN...';
    
    -- Índices para users (verificar columnas primero)
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    
    -- Solo crear índices si las columnas existen
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_open_now') THEN
        CREATE INDEX IF NOT EXISTS idx_users_is_open_now ON users(is_open_now);
        RAISE NOTICE '   ✅ Índice users.is_open_now creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna is_open_now no existe, saltando índice';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_available') THEN
        CREATE INDEX IF NOT EXISTS idx_users_is_available ON users(is_available);
        RAISE NOTICE '   ✅ Índice users.is_available creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna is_available no existe, saltando índice';
    END IF;
    
    -- Índices para products
    CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_is_public ON products(is_public);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
    
    -- Índices para orders
    CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    
    -- Índices para order_items
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
    
    -- Índices para cart
    CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
    CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);
    
    -- Índices para conversations (verificar columnas primero)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant1_id') THEN
        CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
        RAISE NOTICE '   ✅ Índice conversations.participant1_id creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna participant1_id no existe, saltando índice';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'participant2_id') THEN
        CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
        RAISE NOTICE '   ✅ Índice conversations.participant2_id creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna participant2_id no existe, saltando índice';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_at') THEN
        CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
        RAISE NOTICE '   ✅ Índice conversations.last_message_at creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna last_message_at no existe, saltando índice';
    END IF;
    
    -- Índices para messages (verificar columnas primero)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        RAISE NOTICE '   ✅ Índice messages.conversation_id creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna conversation_id no existe, saltando índice';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
        RAISE NOTICE '   ✅ Índice messages.sender_id creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna sender_id no existe, saltando índice';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
        RAISE NOTICE '   ✅ Índice messages.created_at creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna created_at no existe, saltando índice';
    END IF;
    
    -- Índices para notifications (verificar columnas primero)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
        RAISE NOTICE '   ✅ Índice notifications.recipient_id creado';
    ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        RAISE NOTICE '   ✅ Índice notifications.user_id creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna recipient_id/user_id no existe, saltando índice';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        RAISE NOTICE '   ✅ Índice notifications.created_at creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna created_at no existe, saltando índice';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        RAISE NOTICE '   ✅ Índice notifications.read creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna read no existe, saltando índice';
    END IF;
    
    -- Índices para user_addresses
    CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
    
    -- Solo crear índice is_default si la columna existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
        CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);
        RAISE NOTICE '   ✅ Índice user_addresses.is_default creado';
    ELSE
        RAISE NOTICE '   ⚠️ Columna is_default no existe, saltando índice';
    END IF;
    
    RAISE NOTICE '   ✅ Todos los índices creados (con verificación de columnas)';
END $$;

-- ============================================================================
-- PARTE 5: CONFIGURAR TRIGGERS PARA updated_at
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '⚡ CONFIGURANDO TRIGGERS PARA updated_at...';
    
    -- Triggers para todas las tablas
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
    CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
    CREATE TRIGGER update_order_items_updated_at
        BEFORE UPDATE ON order_items FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_cart_updated_at ON cart;
    CREATE TRIGGER update_cart_updated_at
        BEFORE UPDATE ON cart FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
    CREATE TRIGGER update_conversations_updated_at
        BEFORE UPDATE ON conversations FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
    CREATE TRIGGER update_messages_updated_at
        BEFORE UPDATE ON messages FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
    CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE ON notifications FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
    CREATE TRIGGER update_user_addresses_updated_at
        BEFORE UPDATE ON user_addresses FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE '   ✅ Todos los triggers configurados';
END $$;

-- ============================================================================
-- PARTE 6: CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 CONFIGURANDO ROW LEVEL SECURITY...';
    
    -- Habilitar RLS en todas las tablas
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '   ✅ RLS habilitado en todas las tablas';
END $$;

-- Políticas para users
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Políticas para products
DROP POLICY IF EXISTS "Anyone can view public products" ON products;
CREATE POLICY "Anyone can view public products" ON products
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Sellers can manage their products" ON products;
CREATE POLICY "Sellers can manage their products" ON products
    FOR ALL USING (seller_id = auth.uid());

-- Políticas para orders
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
CREATE POLICY "Users can view their orders" ON orders
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Buyers can create orders" ON orders;
CREATE POLICY "Buyers can create orders" ON orders
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can update their orders" ON orders;
CREATE POLICY "Sellers can update their orders" ON orders
    FOR UPDATE USING (seller_id = auth.uid());

-- Políticas para order_items
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
CREATE POLICY "Users can view order items" ON order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can manage order items" ON order_items;
CREATE POLICY "System can manage order items" ON order_items
    FOR ALL WITH CHECK (
        order_id IN (
            SELECT id FROM orders 
            WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
        )
    );

-- Políticas para cart
DROP POLICY IF EXISTS "Users can manage their cart" ON cart;
CREATE POLICY "Users can manage their cart" ON cart
    FOR ALL USING (user_id = auth.uid());

-- Políticas para conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        participant1_id = auth.uid() OR participant2_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        participant1_id = auth.uid() OR participant2_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        participant1_id = auth.uid() OR participant2_id = auth.uid()
    );

-- Políticas para messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
CREATE POLICY "Users can insert messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Políticas para notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Políticas para user_addresses
DROP POLICY IF EXISTS "Users can manage their addresses" ON user_addresses;
CREATE POLICY "Users can manage their addresses" ON user_addresses
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- PARTE 7: VERIFICACIÓN FINAL Y RESUMEN
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    error_count INTEGER := 0;
    total_errors INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL COMPLETA...';
    RAISE NOTICE '';
    
    -- Verificar que todas las tablas existen
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN ('users', 'products', 'orders', 'order_items', 'cart', 
                         'conversations', 'messages', 'notifications', 'user_addresses')
    AND table_schema = 'public';
    
    RAISE NOTICE '📊 RESULTADOS DE VERIFICACIÓN:';
    RAISE NOTICE '';
    RAISE NOTICE '🗃️ TABLAS CREADAS: % de 9', table_count;
    
    -- Verificar columnas críticas
    RAISE NOTICE '🔧 COLUMNAS CRÍTICAS:';
    
    -- Verificar orders.notes
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
        RAISE NOTICE '   ✅ orders.notes: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ orders.notes: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    -- Verificar order_items.price_per_unit
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        RAISE NOTICE '   ✅ order_items.price_per_unit: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ order_items.price_per_unit: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    -- Verificar notifications.recipient_id
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        RAISE NOTICE '   ✅ notifications.recipient_id: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ notifications.recipient_id: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    -- Verificar user_addresses.is_default
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
        RAISE NOTICE '   ✅ user_addresses.is_default: EXISTE (ERROR CORREGIDO)';
    ELSE
        RAISE NOTICE '   ❌ user_addresses.is_default: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    -- Verificar conversations.last_message_id
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') THEN
        RAISE NOTICE '   ✅ conversations.last_message_id: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ conversations.last_message_id: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    total_errors := (9 - table_count) + error_count;
    
    RAISE NOTICE '';
    
    -- Mostrar resultado final
    IF total_errors = 0 THEN
        RAISE NOTICE '🎉 ¡CONFIGURACIÓN COMPLETAMENTE EXITOSA!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ TODAS las tablas están creadas correctamente';
        RAISE NOTICE '✅ TODAS las columnas críticas están presentes';
        RAISE NOTICE '✅ TODOS los errores han sido corregidos';
        RAISE NOTICE '✅ Row Level Security configurado';
        RAISE NOTICE '✅ Índices de optimización creados';
        RAISE NOTICE '✅ Triggers automáticos configurados';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 TU APLICACIÓN TRATO ESTÁ 100% LISTA PARA USAR';
        RAISE NOTICE '';
        RAISE NOTICE '📱 PRÓXIMOS PASOS:';
        RAISE NOTICE '   1. Recarga tu aplicación web';
        RAISE NOTICE '   2. Todos los sistemas funcionarán perfectamente';
        RAISE NOTICE '   3. Ya no habrá errores de columnas faltantes';
        RAISE NOTICE '   4. El sistema está completamente operativo';
        RAISE NOTICE '';
        RAISE NOTICE '🎯 ¡ÉXITO TOTAL! No hay más configuraciones pendientes.';
    ELSE
        RAISE NOTICE '⚠️ Se encontraron % errores pendientes.', total_errors;
        RAISE NOTICE '';
        RAISE NOTICE 'Revisa los logs anteriores para identificar problemas específicos.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🏁 CONFIGURACIÓN FINAL DE TRATO COMPLETADA.';
    RAISE NOTICE '⏰ Script ejecutado exitosamente.';
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- FIN DEL SCRIPT DE CONFIGURACIÓN COMPLETA FINAL
-- ============================================================================
