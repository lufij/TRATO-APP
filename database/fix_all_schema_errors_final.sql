-- ============================================================================
-- TRATO - Solución Definitiva para Errores de Esquema
-- ============================================================================
-- Este script corrige específicamente estos errores:
-- 1. Chat tables check error: usersError
-- 2. Error fetching notifications: column notifications.user_id does not exist  
-- 3. Error loading orders: relationship between 'order_items' and 'products'
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 INICIANDO CORRECCIÓN DE ERRORES DE ESQUEMA...';
    RAISE NOTICE '';
    RAISE NOTICE 'Errores a corregir:';
    RAISE NOTICE '  1. Chat tables check error: usersError';
    RAISE NOTICE '  2. Error fetching notifications: column notifications.user_id does not exist';
    RAISE NOTICE '  3. Error loading orders: relationship between order_items and products';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ERROR 1: Corrección tabla notifications - user_id vs recipient_id
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📧 CORRIGIENDO ERROR DE NOTIFICATIONS...';
    
    -- Verificar si la tabla notifications existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '➕ Creando tabla notifications...';
        
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
        
        -- Índices para mejor performance
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        
        RAISE NOTICE '✅ Tabla notifications creada correctamente';
    ELSE
        RAISE NOTICE '🔍 Verificando estructura de notifications...';
        
        -- Verificar si tiene columna user_id en lugar de recipient_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            RAISE NOTICE '🔄 Renombrando user_id a recipient_id...';
            
            -- Renombrar columna user_id a recipient_id
            ALTER TABLE notifications RENAME COLUMN user_id TO recipient_id;
            
            RAISE NOTICE '✅ Columna renombrada de user_id a recipient_id';
        END IF;
        
        -- Verificar si existe recipient_id
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
            RAISE NOTICE '➕ Agregando columna recipient_id...';
            
            ALTER TABLE notifications ADD COLUMN recipient_id UUID REFERENCES users(id) ON DELETE CASCADE;
            
            RAISE NOTICE '✅ Columna recipient_id agregada';
        END IF;
        
        -- Verificar otras columnas necesarias
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
            ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'general';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'title') THEN
            ALTER TABLE notifications ADD COLUMN title TEXT NOT NULL DEFAULT 'Notificación';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
            ALTER TABLE notifications ADD COLUMN message TEXT NOT NULL DEFAULT '';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'data') THEN
            ALTER TABLE notifications ADD COLUMN data JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
            ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Asegurar índices existen
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        
        RAISE NOTICE '✅ Tabla notifications verificada y corregida';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ERROR 2: Corrección de tablas de chat (conversations y messages)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '💬 CORRIGIENDO ERRORES DE CHAT...';
    
    -- Crear tabla conversations si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') THEN
        RAISE NOTICE '➕ Creando tabla conversations...';
        
        CREATE TABLE conversations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            last_message_id UUID,
            last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(participant1_id, participant2_id)
        );
        
        -- Índices para conversaciones
        CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
        
        RAISE NOTICE '✅ Tabla conversations creada';
    ELSE
        RAISE NOTICE '✅ Tabla conversations ya existe';
    END IF;
    
    -- Crear tabla messages si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
        RAISE NOTICE '➕ Creando tabla messages...';
        
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
        
        -- Índices para mensajes
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
        
        RAISE NOTICE '✅ Tabla messages creada';
    ELSE
        RAISE NOTICE '✅ Tabla messages ya existe';
    END IF;
    
    -- Agregar foreign key constraint para last_message_id si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'conversations' 
        AND constraint_name = 'conversations_last_message_id_fkey'
    ) THEN
        RAISE NOTICE '🔗 Agregando foreign key para last_message_id...';
        
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_last_message_id_fkey 
        FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Foreign key agregada';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ERROR 3: Corrección de relación order_items ↔ products
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📦 CORRIGIENDO ERROR DE ORDER_ITEMS Y PRODUCTS...';
    
    -- Verificar si las tablas existen
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '⚠️ Tabla orders no existe. Creando sistema completo de órdenes...';
        
        -- Crear tabla orders
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
        
        -- Índices para orders
        CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
        
        RAISE NOTICE '✅ Tabla orders creada';
    END IF;
    
    -- Verificar si order_items existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE '➕ Creando tabla order_items...';
        
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
        
        -- Índices para order_items
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
        
        RAISE NOTICE '✅ Tabla order_items creada con relación a products';
    ELSE
        RAISE NOTICE '🔍 Verificando relación order_items ↔ products...';
        
        -- Verificar si existe la foreign key hacia products
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'order_items' 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'product_id'
            AND kcu.referenced_table_name = 'products'
        ) THEN
            RAISE NOTICE '🔗 Agregando foreign key order_items.product_id → products.id...';
            
            -- Verificar que la columna product_id existe
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') THEN
                ALTER TABLE order_items ADD COLUMN product_id UUID;
            END IF;
            
            -- Agregar la foreign key constraint
            ALTER TABLE order_items 
            ADD CONSTRAINT order_items_product_id_fkey 
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
            
            -- Crear índice si no existe
            CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
            
            RAISE NOTICE '✅ Foreign key order_items → products agregada';
        ELSE
            RAISE NOTICE '✅ Relación order_items ↔ products ya existe';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 4: Verificar y crear tabla cart si es necesaria
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🛒 VERIFICANDO TABLA CART...';
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') THEN
        RAISE NOTICE '➕ Creando tabla cart...';
        
        CREATE TABLE cart (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, product_id)
        );
        
        -- Índices para cart
        CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
        CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);
        
        RAISE NOTICE '✅ Tabla cart creada';
    ELSE
        RAISE NOTICE '✅ Tabla cart ya existe';
        
        -- Verificar que tiene updated_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cart' AND column_name = 'updated_at') THEN
            ALTER TABLE cart ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '✅ Columna updated_at agregada a cart';
        END IF;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 5: Configurar triggers para timestamps
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '⚡ CONFIGURANDO TRIGGERS DE TIMESTAMP...';
END $$;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas las tablas que los necesiten
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
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

-- ============================================================================
-- PASO 6: Configurar Row Level Security (RLS)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 CONFIGURANDO ROW LEVEL SECURITY...';
END $$;

-- Habilitar RLS en todas las tablas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- PASO 7: Verificación final completa
-- ============================================================================

DO $$
DECLARE
    notifications_exists BOOLEAN := FALSE;
    conversations_exists BOOLEAN := FALSE;
    messages_exists BOOLEAN := FALSE;
    orders_exists BOOLEAN := FALSE;
    order_items_exists BOOLEAN := FALSE;
    cart_exists BOOLEAN := FALSE;
    recipient_id_exists BOOLEAN := FALSE;
    user_id_exists BOOLEAN := FALSE;
    fk_order_items_products BOOLEAN := FALSE;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL COMPLETA...';
    RAISE NOTICE '';
    
    -- Verificar todas las tablas
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') INTO notifications_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') INTO conversations_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') INTO messages_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') INTO orders_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') INTO order_items_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') INTO cart_exists;
    
    -- Verificar columna recipient_id en notifications
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') INTO recipient_id_exists;
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') INTO user_id_exists;
    
    -- Verificar foreign key order_items → products
    SELECT EXISTS (
        SELECT FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'order_items' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'product_id'
        AND kcu.referenced_table_name = 'products'
    ) INTO fk_order_items_products;
    
    RAISE NOTICE '📋 RESULTADOS DE VERIFICACIÓN:';
    RAISE NOTICE '';
    
    -- ERROR 1: Notifications
    RAISE NOTICE '1️⃣ ERROR NOTIFICATIONS:';
    IF notifications_exists THEN
        RAISE NOTICE '   ✅ Tabla notifications: EXISTE';
        IF recipient_id_exists THEN
            RAISE NOTICE '   ✅ Columna recipient_id: EXISTE';
        ELSE
            RAISE NOTICE '   ❌ Columna recipient_id: FALTA';
            error_count := error_count + 1;
        END IF;
        IF user_id_exists THEN
            RAISE NOTICE '   ⚠️  Columna user_id: AÚN EXISTE (debe ser recipient_id)';
            error_count := error_count + 1;
        ELSE
            RAISE NOTICE '   ✅ Columna user_id: CORRECTAMENTE REMOVIDA';
        END IF;
    ELSE
        RAISE NOTICE '   ❌ Tabla notifications: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE '';
    
    -- ERROR 2: Chat tables
    RAISE NOTICE '2️⃣ ERROR CHAT TABLES:';
    IF conversations_exists THEN
        RAISE NOTICE '   ✅ Tabla conversations: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ Tabla conversations: FALTA';
        error_count := error_count + 1;
    END IF;
    
    IF messages_exists THEN
        RAISE NOTICE '   ✅ Tabla messages: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ Tabla messages: FALTA';
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE '';
    
    -- ERROR 3: Orders relationship
    RAISE NOTICE '3️⃣ ERROR ORDER_ITEMS ↔ PRODUCTS:';
    IF orders_exists THEN
        RAISE NOTICE '   ✅ Tabla orders: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ Tabla orders: FALTA';
        error_count := error_count + 1;
    END IF;
    
    IF order_items_exists THEN
        RAISE NOTICE '   ✅ Tabla order_items: EXISTE';
        IF fk_order_items_products THEN
            RAISE NOTICE '   ✅ FK order_items → products: EXISTE';
        ELSE
            RAISE NOTICE '   ❌ FK order_items → products: FALTA';
            error_count := error_count + 1;
        END IF;
    ELSE
        RAISE NOTICE '   ❌ Tabla order_items: FALTA';
        error_count := error_count + 1;
    END IF;
    
    IF cart_exists THEN
        RAISE NOTICE '   ✅ Tabla cart: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ Tabla cart: FALTA';
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN DE CORRECCIÓN:';
    
    IF error_count = 0 THEN
        RAISE NOTICE '🎉 ¡TODOS LOS ERRORES HAN SIDO CORREGIDOS!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Error notifications.user_id: SOLUCIONADO';
        RAISE NOTICE '✅ Error chat tables: SOLUCIONADO';
        RAISE NOTICE '✅ Error order_items ↔ products: SOLUCIONADO';
        RAISE NOTICE '';
        RAISE NOTICE '🔄 Recarga la aplicación TRATO para confirmar que los errores desaparecieron.';
    ELSE
        RAISE NOTICE '⚠️  Se encontraron % errores pendientes.', error_count;
        RAISE NOTICE '🔧 Algunos problemas no se pudieron resolver automáticamente.';
        RAISE NOTICE '📞 Contacta al soporte técnico si persisten los errores.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CONFIGURACIÓN COMPLETADA.';
    
END $$;