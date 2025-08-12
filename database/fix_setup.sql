-- ============================================================================
-- TRATO - Script Principal de Configuración Completa (ACTUALIZADO)
-- ============================================================================
-- Este script configura completamente la base de datos TRATO desde cero
-- Incluye todas las correcciones de errores conocidos
-- Versión: COMPLETA Y CORREGIDA para error is_default
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 INICIANDO CONFIGURACIÓN COMPLETA DE TRATO (CORREGIDA)...';
    RAISE NOTICE '';
    RAISE NOTICE 'Este script configurará:';
    RAISE NOTICE '  • Sistema de usuarios y autenticación';
    RAISE NOTICE '  • Sistema de productos y categorías';
    RAISE NOTICE '  • Sistema de pedidos y order_items';
    RAISE NOTICE '  • Sistema de carrito de compras';
    RAISE NOTICE '  • Sistema de chat y mensajería';
    RAISE NOTICE '  • Sistema de notificaciones';
    RAISE NOTICE '  • Sistema de ubicaciones (CON is_default)';
    RAISE NOTICE '  • Row Level Security (RLS)';
    RAISE NOTICE '  • Todas las correcciones conocidas';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Correcciones incluidas:';
    RAISE NOTICE '  • orders.notes (column does not exist)';
    RAISE NOTICE '  • user_addresses.is_default (column does not exist)';
    RAISE NOTICE '  • order_items.price_per_unit (column does not exist)';
    RAISE NOTICE '  • notifications.recipient_id vs user_id';
    RAISE NOTICE '  • conversations.last_message_id foreign key';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 1: Crear tabla users base (si no existe)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '👥 CONFIGURANDO SISTEMA DE USUARIOS...';
    
    -- Crear tabla users si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '   ➕ Creando tabla users...';
        
        CREATE TABLE users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL CHECK (role IN ('comprador', 'vendedor', 'repartidor', 'admin')),
            business_name TEXT, -- Para vendedores
            business_description TEXT, -- Para vendedores
            business_address TEXT, -- Para vendedores
            is_open_now BOOLEAN DEFAULT true, -- Para vendedores
            weekly_hours JSONB DEFAULT '{}', -- Para vendedores
            driver_license TEXT, -- Para repartidores
            vehicle_type TEXT, -- Para repartidores
            is_available BOOLEAN DEFAULT false, -- Para repartidores
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla users creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla users ya existe';
        
        -- Verificar y agregar columnas faltantes
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_name') THEN
            ALTER TABLE users ADD COLUMN business_name TEXT;
            RAISE NOTICE '   ➕ Columna business_name agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_description') THEN
            ALTER TABLE users ADD COLUMN business_description TEXT;
            RAISE NOTICE '   ➕ Columna business_description agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_address') THEN
            ALTER TABLE users ADD COLUMN business_address TEXT;
            RAISE NOTICE '   ➕ Columna business_address agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_open_now') THEN
            ALTER TABLE users ADD COLUMN is_open_now BOOLEAN DEFAULT true;
            RAISE NOTICE '   ➕ Columna is_open_now agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'weekly_hours') THEN
            ALTER TABLE users ADD COLUMN weekly_hours JSONB DEFAULT '{}';
            RAISE NOTICE '   ➕ Columna weekly_hours agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'driver_license') THEN
            ALTER TABLE users ADD COLUMN driver_license TEXT;
            RAISE NOTICE '   ➕ Columna driver_license agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'vehicle_type') THEN
            ALTER TABLE users ADD COLUMN vehicle_type TEXT;
            RAISE NOTICE '   ➕ Columna vehicle_type agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_available') THEN
            ALTER TABLE users ADD COLUMN is_available BOOLEAN DEFAULT false;
            RAISE NOTICE '   ➕ Columna is_available agregada';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
            ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 2: Crear tabla products
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📦 CONFIGURANDO SISTEMA DE PRODUCTOS...';
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE '   ➕ Creando tabla products...';
        
        CREATE TABLE products (
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
        
        RAISE NOTICE '   ✅ Tabla products creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla products ya existe';
        
        -- Verificar columnas esenciales
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
            ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a products';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 3: Crear sistema de órdenes completo (CON notes)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🛒 CONFIGURANDO SISTEMA DE PEDIDOS...';
    
    -- Crear tabla orders
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '   ➕ Creando tabla orders...';
        
        CREATE TABLE orders (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            total DECIMAL(10,2) NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
            delivery_address TEXT,
            delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup', 'dine_in')),
            notes TEXT,
            estimated_delivery TIMESTAMP WITH TIME ZONE,
            delivered_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla orders creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla orders ya existe';
        
        -- Verificar columnas esenciales (INCLUYENDO notes)
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_type') THEN
            ALTER TABLE orders ADD COLUMN delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup', 'dine_in'));
            RAISE NOTICE '   ➕ Columna delivery_type agregada a orders';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
            ALTER TABLE orders ADD COLUMN notes TEXT;
            RAISE NOTICE '   ➕ Columna notes agregada a orders';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'estimated_delivery') THEN
            ALTER TABLE orders ADD COLUMN estimated_delivery TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE '   ➕ Columna estimated_delivery agregada a orders';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
            ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE '   ➕ Columna delivered_at agregada a orders';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
            ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a orders';
        END IF;
    END IF;
    
    -- Crear tabla order_items con todas las columnas necesarias
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE '   ➕ Creando tabla order_items...';
        
        CREATE TABLE order_items (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla order_items creada con todas las columnas necesarias';
    ELSE
        RAISE NOTICE '   ✅ Tabla order_items ya existe';
        
        -- Verificar y agregar columnas críticas que suelen faltar
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') THEN
            ALTER TABLE order_items ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0;
            RAISE NOTICE '   ➕ Columna price_per_unit agregada a order_items';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') THEN
            ALTER TABLE order_items ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0;
            RAISE NOTICE '   ➕ Columna total_price agregada a order_items';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') THEN
            ALTER TABLE order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
            RAISE NOTICE '   ➕ Columna quantity agregada a order_items';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') THEN
            ALTER TABLE order_items ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
            RAISE NOTICE '   ➕ Columna order_id agregada a order_items';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') THEN
            ALTER TABLE order_items ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;
            RAISE NOTICE '   ➕ Columna product_id agregada a order_items';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'updated_at') THEN
            ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a order_items';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 4: Crear sistema de carrito
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🛍️ CONFIGURANDO SISTEMA DE CARRITO...';
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') THEN
        RAISE NOTICE '   ➕ Creando tabla cart...';
        
        CREATE TABLE cart (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, product_id)
        );
        
        RAISE NOTICE '   ✅ Tabla cart creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla cart ya existe';
        
        -- Verificar columna updated_at que suele faltar
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cart' AND column_name = 'updated_at') THEN
            ALTER TABLE cart ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a cart';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 5: Crear sistema de chat y mensajería
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '💬 CONFIGURANDO SISTEMA DE CHAT...';
    
    -- Crear tabla conversations
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') THEN
        RAISE NOTICE '   ➕ Creando tabla conversations...';
        
        CREATE TABLE conversations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(participant1_id, participant2_id)
        );
        
        RAISE NOTICE '   ✅ Tabla conversations creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla conversations ya existe';
        
        -- Verificar columnas esenciales
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'updated_at') THEN
            ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a conversations';
        END IF;
    END IF;
    
    -- Crear tabla messages
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
        RAISE NOTICE '   ➕ Creando tabla messages...';
        
        CREATE TABLE messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
            read_by JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla messages creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla messages ya existe';
        
        -- Verificar columnas esenciales
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at') THEN
            ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a messages';
        END IF;
    END IF;
    
    -- Agregar last_message_id a conversations DESPUÉS de crear messages
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') THEN
        RAISE NOTICE '   ➕ Agregando columna last_message_id a conversations...';
        
        ALTER TABLE conversations ADD COLUMN last_message_id UUID;
        
        -- Agregar foreign key constraint
        BEGIN
            ALTER TABLE conversations 
            ADD CONSTRAINT conversations_last_message_id_fkey 
            FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;
            
            RAISE NOTICE '   ✅ Foreign key conversations → messages agregada';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ Foreign key conversations → messages ya existe: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ✅ Columna last_message_id ya existe en conversations';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 6: Crear sistema de notificaciones (CON recipient_id)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔔 CONFIGURANDO SISTEMA DE NOTIFICACIONES...';
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '   ➕ Creando tabla notifications...';
        
        CREATE TABLE notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL DEFAULT 'general',
            title TEXT NOT NULL DEFAULT 'Notificación',
            message TEXT NOT NULL DEFAULT '',
            data JSONB DEFAULT '{}',
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla notifications creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla notifications ya existe';
        
        -- Verificar si tiene user_id en lugar de recipient_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') 
           AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
            
            RAISE NOTICE '   🔄 Renombrando user_id a recipient_id...';
            ALTER TABLE notifications RENAME COLUMN user_id TO recipient_id;
            RAISE NOTICE '   ✅ Columna renombrada de user_id a recipient_id';
        END IF;
        
        -- Verificar columnas esenciales
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
            ALTER TABLE notifications ADD COLUMN recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE '   ➕ Columna recipient_id agregada a notifications';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'updated_at') THEN
            ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a notifications';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 7: Crear sistema de ubicaciones (CON is_default INCLUIDO)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📍 CONFIGURANDO SISTEMA DE UBICACIONES (CON is_default)...';
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_addresses') THEN
        RAISE NOTICE '   ➕ Creando tabla user_addresses...';
        
        CREATE TABLE user_addresses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            address_line TEXT NOT NULL,
            city TEXT DEFAULT 'Gualán',
            department TEXT DEFAULT 'Zacapa',
            country TEXT DEFAULT 'Guatemala',
            postal_code TEXT,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            is_default BOOLEAN DEFAULT FALSE,
            address_type TEXT DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'other')),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '   ✅ Tabla user_addresses creada';
    ELSE
        RAISE NOTICE '   ✅ Tabla user_addresses ya existe';
        
        -- Verificar y agregar TODAS las columnas esenciales
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_line') THEN
            ALTER TABLE user_addresses ADD COLUMN address_line TEXT NOT NULL DEFAULT '';
            RAISE NOTICE '   ➕ Columna address_line agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'city') THEN
            ALTER TABLE user_addresses ADD COLUMN city TEXT DEFAULT 'Gualán';
            RAISE NOTICE '   ➕ Columna city agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'department') THEN
            ALTER TABLE user_addresses ADD COLUMN department TEXT DEFAULT 'Zacapa';
            RAISE NOTICE '   ➕ Columna department agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'country') THEN
            ALTER TABLE user_addresses ADD COLUMN country TEXT DEFAULT 'Guatemala';
            RAISE NOTICE '   ➕ Columna country agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'postal_code') THEN
            ALTER TABLE user_addresses ADD COLUMN postal_code TEXT;
            RAISE NOTICE '   ➕ Columna postal_code agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'latitude') THEN
            ALTER TABLE user_addresses ADD COLUMN latitude DECIMAL(10, 8);
            RAISE NOTICE '   ➕ Columna latitude agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'longitude') THEN
            ALTER TABLE user_addresses ADD COLUMN longitude DECIMAL(11, 8);
            RAISE NOTICE '   ➕ Columna longitude agregada a user_addresses';
        END IF;
        
        -- COLUMNA CRÍTICA: is_default (que estaba causando el error)
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
            ALTER TABLE user_addresses ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
            RAISE NOTICE '   ➕ Columna is_default agregada a user_addresses (ERROR CORREGIDO)';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'address_type') THEN
            ALTER TABLE user_addresses ADD COLUMN address_type TEXT DEFAULT 'home';
            
            -- Agregar constraint después
            BEGIN
                ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_address_type_check CHECK (address_type IN ('home', 'work', 'other'));
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '   ⚠️ Constraint address_type ya existe: %', SQLERRM;
            END;
            
            RAISE NOTICE '   ➕ Columna address_type agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'notes') THEN
            ALTER TABLE user_addresses ADD COLUMN notes TEXT;
            RAISE NOTICE '   ➕ Columna notes agregada a user_addresses';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'updated_at') THEN
            ALTER TABLE user_addresses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '   ➕ Columna updated_at agregada a user_addresses';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 8: Crear índices para optimización (SOLO SI COLUMNAS EXISTEN)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📊 CONFIGURANDO ÍNDICES DE OPTIMIZACIÓN (CON VERIFICACIÓN DE COLUMNAS)...';
    
    -- Índices para users
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    
    -- Índices para users (solo si columnas existen)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_open_now') THEN
        CREATE INDEX IF NOT EXISTS idx_users_is_open_now ON users(is_open_now);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_available') THEN
        CREATE INDEX IF NOT EXISTS idx_users_is_available ON users(is_available);
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
    
    -- Índices para conversations
    CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
    
    -- Índices para messages
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    
    -- Índices para notifications
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    
    -- Índices para user_addresses (CON VERIFICACIÓN DE is_default)
    CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
    
    -- ÍNDICE CRÍTICO: is_default (solo si la columna existe)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') THEN
        CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);
        RAISE NOTICE '   ✅ Índice is_default creado correctamente (error corregido)';
    ELSE
        RAISE NOTICE '   ⚠️ Columna is_default no existe, saltando índice';
    END IF;
    
    RAISE NOTICE '   ✅ Índices de optimización configurados';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 9: Configurar triggers para updated_at
-- ============================================================================

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

DO $$
BEGIN
    RAISE NOTICE '⚡ CONFIGURANDO TRIGGERS PARA updated_at...';
    
    -- Triggers para todas las tablas que necesiten updated_at
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
    CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
    CREATE TRIGGER update_order_items_updated_at
        BEFORE UPDATE ON order_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_cart_updated_at ON cart;
    CREATE TRIGGER update_cart_updated_at
        BEFORE UPDATE ON cart
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
    CREATE TRIGGER update_conversations_updated_at
        BEFORE UPDATE ON conversations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
    CREATE TRIGGER update_messages_updated_at
        BEFORE UPDATE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
    CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE ON notifications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
    CREATE TRIGGER update_user_addresses_updated_at
        BEFORE UPDATE ON user_addresses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE '   ✅ Triggers para updated_at configurados';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 10: Configurar Row Level Security (RLS)
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

-- Policies para users
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Policies para products
DROP POLICY IF EXISTS "Anyone can view public products" ON products;
CREATE POLICY "Anyone can view public products" ON products
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Sellers can manage their products" ON products;
CREATE POLICY "Sellers can manage their products" ON products
    FOR ALL USING (seller_id = auth.uid());

-- Policies para orders
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
CREATE POLICY "Users can view their orders" ON orders
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Buyers can create orders" ON orders;
CREATE POLICY "Buyers can create orders" ON orders
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can update their orders" ON orders;
CREATE POLICY "Sellers can update their orders" ON orders
    FOR UPDATE USING (seller_id = auth.uid());

-- Policies para order_items
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

-- Policies para cart
DROP POLICY IF EXISTS "Users can manage their cart" ON cart;
CREATE POLICY "Users can manage their cart" ON cart
    FOR ALL USING (user_id = auth.uid());

-- Policies para conversations
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

-- Policies para messages
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

-- Policies para notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Policies para user_addresses
DROP POLICY IF EXISTS "Users can manage their addresses" ON user_addresses;
CREATE POLICY "Users can manage their addresses" ON user_addresses
    FOR ALL USING (user_id = auth.uid());

DO $$
BEGIN
    RAISE NOTICE '   ✅ Policies de RLS configuradas';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 11: Crear datos de prueba básicos (opcional)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧪 CREANDO DATOS DE PRUEBA BÁSICOS...';
    
    -- Solo crear datos si no hay usuarios aún
    IF (SELECT COUNT(*) FROM users) = 0 THEN
        RAISE NOTICE '   ➕ Creando usuario administrador de prueba...';
        
        -- Crear usuario admin básico
        BEGIN
            INSERT INTO users (id, email, name, phone, role, created_at)
            VALUES (
                gen_random_uuid(),
                'admin@trato.local',
                'Administrador TRATO',
                '555-0000',
                'admin',
                NOW()
            );
            
            RAISE NOTICE '   ✅ Usuario admin creado: admin@trato.local';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ⚠️ No se pudo crear usuario admin: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ✅ Ya existen usuarios en el sistema';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 12: Verificación final completa
-- ============================================================================

DO $$
DECLARE
    users_exists BOOLEAN := FALSE;
    products_exists BOOLEAN := FALSE;
    orders_exists BOOLEAN := FALSE;
    order_items_exists BOOLEAN := FALSE;
    cart_exists BOOLEAN := FALSE;
    conversations_exists BOOLEAN := FALSE;
    messages_exists BOOLEAN := FALSE;
    notifications_exists BOOLEAN := FALSE;
    user_addresses_exists BOOLEAN := FALSE;
    notes_exists BOOLEAN := FALSE;
    price_per_unit_exists BOOLEAN := FALSE;
    recipient_id_exists BOOLEAN := FALSE;
    is_default_exists BOOLEAN := FALSE;
    last_message_id_exists BOOLEAN := FALSE;
    all_tables_exist BOOLEAN := FALSE;
    critical_columns_exist BOOLEAN := FALSE;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL COMPLETA (TODAS LAS CORRECCIONES)...';
    RAISE NOTICE '';
    
    -- Verificar todas las tablas principales
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') INTO users_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') INTO products_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') INTO orders_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') INTO order_items_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') INTO cart_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') INTO conversations_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') INTO messages_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') INTO notifications_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_addresses') INTO user_addresses_exists;
    
    -- Verificar columnas críticas que causan errores
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') INTO notes_exists;
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') INTO price_per_unit_exists;
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') INTO recipient_id_exists;
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'is_default') INTO is_default_exists;
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_id') INTO last_message_id_exists;
    
    all_tables_exist := users_exists AND products_exists AND orders_exists AND order_items_exists AND cart_exists AND conversations_exists AND messages_exists AND notifications_exists AND user_addresses_exists;
    critical_columns_exist := notes_exists AND price_per_unit_exists AND recipient_id_exists AND is_default_exists AND last_message_id_exists;
    
    RAISE NOTICE '📊 RESULTADOS DE VERIFICACIÓN:';
    RAISE NOTICE '';
    
    -- Mostrar estado de tablas
    RAISE NOTICE '🗃️ TABLAS PRINCIPALES:';
    RAISE NOTICE '   users: %', CASE WHEN users_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   products: %', CASE WHEN products_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   orders: %', CASE WHEN orders_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   order_items: %', CASE WHEN order_items_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   cart: %', CASE WHEN cart_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   conversations: %', CASE WHEN conversations_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   messages: %', CASE WHEN messages_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   notifications: %', CASE WHEN notifications_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   user_addresses: %', CASE WHEN user_addresses_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '';
    
    -- Mostrar estado de columnas críticas
    RAISE NOTICE '🔧 COLUMNAS CRÍTICAS (correcciones aplicadas):';
    RAISE NOTICE '   orders.notes: %', CASE WHEN notes_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   order_items.price_per_unit: %', CASE WHEN price_per_unit_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   notifications.recipient_id: %', CASE WHEN recipient_id_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   user_addresses.is_default: %', CASE WHEN is_default_exists THEN '✅ EXISTE (ERROR CORREGIDO)' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   conversations.last_message_id: %', CASE WHEN last_message_id_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '';
    
    -- Contar errores
    IF NOT users_exists THEN error_count := error_count + 1; END IF;
    IF NOT products_exists THEN error_count := error_count + 1; END IF;
    IF NOT orders_exists THEN error_count := error_count + 1; END IF;
    IF NOT order_items_exists THEN error_count := error_count + 1; END IF;
    IF NOT cart_exists THEN error_count := error_count + 1; END IF;
    IF NOT conversations_exists THEN error_count := error_count + 1; END IF;
    IF NOT messages_exists THEN error_count := error_count + 1; END IF;
    IF NOT notifications_exists THEN error_count := error_count + 1; END IF;
    IF NOT user_addresses_exists THEN error_count := error_count + 1; END IF;
    IF NOT notes_exists THEN error_count := error_count + 1; END IF;
    IF NOT price_per_unit_exists THEN error_count := error_count + 1; END IF;
    IF NOT recipient_id_exists THEN error_count := error_count + 1; END IF;
    IF NOT is_default_exists THEN error_count := error_count + 1; END IF;
    IF NOT last_message_id_exists THEN error_count := error_count + 1; END IF;
    
    -- Mostrar resultado final
    IF error_count = 0 THEN
        RAISE NOTICE '🎉 ¡CONFIGURACIÓN COMPLETA EXITOSA (TODAS LAS CORRECCIONES APLICADAS)!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Todas las tablas están configuradas correctamente';
        RAISE NOTICE '✅ Todas las columnas críticas están presentes';
        RAISE NOTICE '✅ Error user_addresses.is_default: CORREGIDO';
        RAISE NOTICE '✅ Error orders.notes: CORREGIDO';
        RAISE NOTICE '✅ Error order_items.price_per_unit: CORREGIDO';
        RAISE NOTICE '✅ Error notifications.recipient_id: CORREGIDO';
        RAISE NOTICE '✅ Error conversations.last_message_id: CORREGIDO';
        RAISE NOTICE '✅ Sistema de pedidos funcionará correctamente';
        RAISE NOTICE '✅ Sistema de chat funcionará correctamente';
        RAISE NOTICE '✅ Sistema de notificaciones funcionará correctamente';
        RAISE NOTICE '✅ Sistema de ubicaciones funcionará correctamente';
        RAISE NOTICE '✅ Row Level Security configurado';
        RAISE NOTICE '✅ Índices de optimización configurados';
        RAISE NOTICE '✅ Triggers de updated_at configurados';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 TU APLICACIÓN TRATO ESTÁ COMPLETAMENTE LISTA PARA USAR';
        RAISE NOTICE '';
        RAISE NOTICE '📱 Próximos pasos:';
        RAISE NOTICE '   1. Recarga la aplicación web';
        RAISE NOTICE '   2. Todos los sistemas deberían funcionar correctamente';
        RAISE NOTICE '   3. El error "column is_default does not exist" está solucionado';
        RAISE NOTICE '   4. Si hay problemas, revisa los logs de la aplicación';
    ELSE
        RAISE NOTICE '⚠️ CONFIGURACIÓN INCOMPLETA';
        RAISE NOTICE '';
        RAISE NOTICE 'Se encontraron % problemas pendientes.', error_count;
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Para corregir problemas específicos:';
        RAISE NOTICE '   • Error user_addresses.is_default: ejecutar fix_user_addresses_is_default.sql';
        RAISE NOTICE '   • Error orders.notes: ejecutar fix_orders_notes_column.sql';
        RAISE NOTICE '   • Error order_items.price_per_unit: ejecutar fix_order_items_columns_corrected.sql';
        RAISE NOTICE '   • Error notifications.user_id: ejecutar fix_all_schema_errors_final_corrected.sql';
        RAISE NOTICE '   • Error last_message_id: ejecutar verify_last_message_id_fix_corrected.sql';
        RAISE NOTICE '';
        RAISE NOTICE '📞 Si persisten los problemas, revisar logs detallados arriba.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CONFIGURACIÓN COMPLETA DE TRATO FINALIZADA (CORRECCIONES INCLUIDAS).';
    RAISE NOTICE '⏰ Tiempo estimado de configuración: 3-5 minutos';
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- FIN DEL SCRIPT DE CONFIGURACIÓN COMPLETA (CORREGIDO)
-- ============================================================================