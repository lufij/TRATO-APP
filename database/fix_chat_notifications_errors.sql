-- ============================================================================
-- TRATO - Corrección de Errores de Chat y Notificaciones
-- ============================================================================
-- Este script corrige específicamente los errores:
-- 1. "column notifications.user_id does not exist" 
-- 2. Chat tables check errors
-- 3. Problemas de integridad referencial
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 INICIANDO CORRECCIÓN DE ERRORES DE CHAT Y NOTIFICACIONES...';
END $$;

-- ============================================================================
-- PASO 1: Corregir tabla notifications - user_id vs recipient_id
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📧 Corrigiendo tabla notifications...';
    
    -- Verificar si la tabla notifications existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '⚠️ Tabla notifications no existe, creándola...';
        
        CREATE TABLE notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            data JSONB DEFAULT '{}',
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Índices para mejor performance
        CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
        CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX idx_notifications_read ON notifications(read);
        CREATE INDEX idx_notifications_type ON notifications(type);
        
        RAISE NOTICE '✅ Tabla notifications creada correctamente';
    ELSE
        -- La tabla existe, verificar estructura
        RAISE NOTICE '🔍 Verificando estructura de notifications...';
        
        -- Verificar si tiene columna user_id en lugar de recipient_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            RAISE NOTICE '🔄 Cambiando user_id por recipient_id...';
            
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
        
        -- Verificar índices
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'notifications' AND indexname = 'idx_notifications_recipient_id') THEN
            CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'notifications' AND indexname = 'idx_notifications_created_at') THEN
            CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'notifications' AND indexname = 'idx_notifications_read') THEN
            CREATE INDEX idx_notifications_read ON notifications(read);
        END IF;
        
        RAISE NOTICE '✅ Tabla notifications verificada y corregida';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: Corregir tablas de chat (conversaciones y mensajes)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '💬 Corrigiendo tablas de chat...';
    
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
        CREATE INDEX idx_conversations_participant1 ON conversations(participant1_id);
        CREATE INDEX idx_conversations_participant2 ON conversations(participant2_id);
        CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
        
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
        CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
        CREATE INDEX idx_messages_sender_id ON messages(sender_id);
        CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
        CREATE INDEX idx_messages_type ON messages(message_type);
        
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
END $$;

-- ============================================================================
-- PASO 3: Crear/Actualizar funciones de trigger para timestamps
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '⚡ Configurando triggers para timestamps...';
END $$;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 4: Configurar Row Level Security (RLS)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 Configurando Row Level Security...';
END $$;

-- Habilitar RLS en todas las tablas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- PASO 5: Verificación final
-- ============================================================================

DO $$
DECLARE
    notifications_count INTEGER;
    conversations_count INTEGER;
    messages_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL...';
    
    -- Verificar notifications
    SELECT COUNT(*) INTO notifications_count FROM information_schema.tables WHERE table_name = 'notifications';
    IF notifications_count > 0 THEN
        RAISE NOTICE '✅ Tabla notifications: OK';
    ELSE
        RAISE NOTICE '❌ Tabla notifications: FALTA';
    END IF;
    
    -- Verificar conversaciones
    SELECT COUNT(*) INTO conversations_count FROM information_schema.tables WHERE table_name = 'conversations';
    IF conversations_count > 0 THEN
        RAISE NOTICE '✅ Tabla conversations: OK';
    ELSE
        RAISE NOTICE '❌ Tabla conversations: FALTA';
    END IF;
    
    -- Verificar mensajes
    SELECT COUNT(*) INTO messages_count FROM information_schema.tables WHERE table_name = 'messages';
    IF messages_count > 0 THEN
        RAISE NOTICE '✅ Tabla messages: OK';
    ELSE
        RAISE NOTICE '❌ Tabla messages: FALTA';
    END IF;
    
    -- Verificar columna recipient_id en notifications
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        RAISE NOTICE '✅ Columna notifications.recipient_id: OK';
    ELSE
        RAISE NOTICE '❌ Columna notifications.recipient_id: FALTA';
    END IF;
    
    RAISE NOTICE '🎉 CORRECCIÓN COMPLETADA!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 RESUMEN:';
    RAISE NOTICE '   • Tabla notifications: Corregida (user_id → recipient_id)';
    RAISE NOTICE '   • Tabla conversations: Verificada/Creada';
    RAISE NOTICE '   • Tabla messages: Verificada/Creada'; 
    RAISE NOTICE '   • Triggers: Configurados';
    RAISE NOTICE '   • RLS Policies: Configuradas';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Los errores de chat y notificaciones han sido solucionados.';
    RAISE NOTICE '🔄 Recarga la aplicación para ver los cambios.';
END $$;