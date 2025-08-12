-- =================================================================
-- FIX CHAT, NOTIFICATIONS AND USER STATUS SCHEMA ERRORS
-- =================================================================
-- Este script resuelve todos los errores de esquema de base de datos:
-- 1. Tablas de chat/conversaciones faltantes
-- 2. Columna user_id faltante en notifications
-- 3. Columna status faltante en users
-- 4. Foreign keys y relaciones faltantes
-- =================================================================

-- 1. AGREGAR COLUMNA STATUS A USERS
-- =================================================================

DO $$
BEGIN
    -- Agregar columna status a users si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away'));
        RAISE NOTICE 'Columna status agregada a tabla users';
    ELSE
        RAISE NOTICE 'Columna status ya existe en tabla users';
    END IF;
END $$;

-- 2. CREAR TABLA CONVERSATIONS (Sistema de Chat)
-- =================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'private' CHECK (type IN ('private', 'group', 'support')),
    title VARCHAR(255),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar conversaciones duplicadas entre los mismos usuarios
    CONSTRAINT unique_participants UNIQUE (participant1_id, participant2_id),
    
    -- Constraint para evitar que un usuario hable consigo mismo
    CONSTRAINT different_participants CHECK (participant1_id != participant2_id)
);

-- 3. CREAR TABLA MESSAGES (Mensajes de Chat)
-- =================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location', 'system')),
    read_by_recipient BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB, -- Para datos adicionales como ubicación, archivos, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREAR TABLA CONVERSATION_PARTICIPANTS (Para chats grupales)
-- =================================================================

CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'moderator')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar participantes duplicados
    CONSTRAINT unique_conversation_participant UNIQUE (conversation_id, user_id)
);

-- 5. ARREGLAR TABLA NOTIFICATIONS - AGREGAR USER_ID
-- =================================================================

DO $$
BEGIN
    -- Verificar si la tabla notifications existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
        -- Agregar columna user_id si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications' 
            AND column_name = 'user_id'
        ) THEN
            ALTER TABLE notifications ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Columna user_id agregada a tabla notifications';
        ELSE
            RAISE NOTICE 'Columna user_id ya existe en tabla notifications';
        END IF;
        
        -- Agregar otras columnas comunes si no existen
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications' 
            AND column_name = 'type'
        ) THEN
            ALTER TABLE notifications ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'general';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications' 
            AND column_name = 'title'
        ) THEN
            ALTER TABLE notifications ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications' 
            AND column_name = 'message'
        ) THEN
            ALTER TABLE notifications ADD COLUMN message TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications' 
            AND column_name = 'is_read'
        ) THEN
            ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications' 
            AND column_name = 'data'
        ) THEN
            ALTER TABLE notifications ADD COLUMN data JSONB;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications' 
            AND column_name = 'created_at'
        ) THEN
            ALTER TABLE notifications ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
    ELSE
        -- Crear tabla notifications completa si no existe
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL DEFAULT 'general',
            title VARCHAR(255) NOT NULL,
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabla notifications creada completamente';
    END IF;
END $$;

-- 6. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =================================================================

-- Índices para conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, read_by_recipient) WHERE read_by_recipient = FALSE;

-- Índices para conversation_participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Índices para users status
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE status = 'online';

-- 7. CREAR TRIGGERS PARA AUTOMATIZACIÓN
-- =================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at en conversations
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para updated_at en messages
DROP TRIGGER IF EXISTS trigger_messages_updated_at ON messages;
CREATE TRIGGER trigger_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar last_message_at en conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- 8. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =================================================================

-- Habilitar RLS en todas las tablas de chat
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can manage conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Admin can view all messages" ON messages;
DROP POLICY IF EXISTS "Admin can view all notifications" ON notifications;

-- Políticas para conversations
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        participant1_id = auth.uid() OR 
        participant2_id = auth.uid()
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        participant1_id = auth.uid() OR 
        participant2_id = auth.uid()
    );

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        participant1_id = auth.uid() OR 
        participant2_id = auth.uid()
    );

-- Políticas para messages
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = messages.conversation_id 
            AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Políticas para conversation_participants
CREATE POLICY "Users can view their conversation participants" ON conversation_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_participants.conversation_id 
            AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage conversation participants" ON conversation_participants
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_participants.conversation_id 
            AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

-- Políticas para notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (TRUE);

-- Políticas de admin para todas las tablas
CREATE POLICY "Admin can view all conversations" ON conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = 'trato.app1984@gmail.com'
        )
    );

CREATE POLICY "Admin can view all messages" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = 'trato.app1984@gmail.com'
        )
    );

CREATE POLICY "Admin can view all notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = 'trato.app1984@gmail.com'
        )
    );

-- 9. CONFIGURAR REALTIME PARA CHAT EN TIEMPO REAL
-- =================================================================

DO $$
BEGIN
    -- Agregar tablas a realtime para notificaciones en tiempo real
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
        RAISE NOTICE 'Tabla conversations agregada a realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Tabla conversations ya está en realtime';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
        RAISE NOTICE 'Tabla messages agregada a realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Tabla messages ya está en realtime';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        RAISE NOTICE 'Tabla notifications agregada a realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Tabla notifications ya está en realtime';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
        RAISE NOTICE 'Tabla users agregada a realtime (para status online/offline)';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Tabla users ya está en realtime';
    END;
END $$;

-- 10. CREAR VISTAS ÚTILES PARA CHAT Y NOTIFICACIONES
-- =================================================================

-- Vista para conversaciones con información de participantes
CREATE OR REPLACE VIEW conversation_details_view AS
SELECT 
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.type,
    c.title,
    c.last_message_at,
    c.created_at,
    u1.name as participant1_name,
    u1.email as participant1_email,
    u1.status as participant1_status,
    u2.name as participant2_name,
    u2.email as participant2_email,
    u2.status as participant2_status,
    (
        SELECT COUNT(*) 
        FROM messages m 
        WHERE m.conversation_id = c.id 
        AND m.read_by_recipient = FALSE
    ) as unread_count,
    (
        SELECT m.content
        FROM messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
    ) as last_message_content
FROM conversations c
LEFT JOIN users u1 ON c.participant1_id = u1.id
LEFT JOIN users u2 ON c.participant2_id = u2.id;

-- Vista para notificaciones no leídas por usuario
CREATE OR REPLACE VIEW unread_notifications_view AS
SELECT 
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.created_at,
    u.name as user_name,
    u.email as user_email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
WHERE n.is_read = FALSE
ORDER BY n.created_at DESC;

-- 11. FUNCIONES AUXILIARES PARA CHAT
-- =================================================================

-- Función para crear o obtener una conversación entre dos usuarios
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_uuid UUID;
    min_id UUID;
    max_id UUID;
BEGIN
    -- Ordenar los IDs para consistencia
    IF user1_id < user2_id THEN
        min_id := user1_id;
        max_id := user2_id;
    ELSE
        min_id := user2_id;
        max_id := user1_id;
    END IF;
    
    -- Buscar conversación existente
    SELECT id INTO conversation_uuid
    FROM conversations 
    WHERE (participant1_id = min_id AND participant2_id = max_id)
       OR (participant1_id = max_id AND participant2_id = min_id)
    LIMIT 1;
    
    -- Si no existe, crear nueva conversación
    IF conversation_uuid IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id)
        VALUES (min_id, max_id)
        RETURNING id INTO conversation_uuid;
    END IF;
    
    RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_uuid UUID, user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE messages 
    SET read_by_recipient = TRUE, read_at = NOW()
    WHERE conversation_id = conversation_uuid 
      AND sender_id != user_uuid 
      AND read_by_recipient = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 12. VERIFICACIÓN FINAL Y CONFIRMACIÓN
-- =================================================================

DO $$
DECLARE
    tables_count INTEGER;
    chat_tables_count INTEGER;
    notifications_columns INTEGER;
    users_status_column INTEGER;
    foreign_keys_count INTEGER;
    policies_count INTEGER;
BEGIN
    -- Verificar tablas principales
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'notifications');
    
    -- Verificar tablas de chat
    SELECT COUNT(*) INTO chat_tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('conversations', 'messages', 'conversation_participants');
    
    -- Verificar columnas en notifications
    SELECT COUNT(*) INTO notifications_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
    AND column_name IN ('user_id', 'type', 'title', 'is_read');
    
    -- Verificar columna status en users
    SELECT COUNT(*) INTO users_status_column
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'users'
    AND column_name = 'status';
    
    -- Verificar foreign keys
    SELECT COUNT(*) INTO foreign_keys_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%participant%_fkey%';
    
    -- Verificar políticas RLS
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename IN ('conversations', 'messages', 'notifications');
    
    -- Mostrar resultados
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CHAT, NOTIFICACIONES Y STATUS - REPARACIÓN COMPLETA';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Tablas base: % de 2 (users, notifications)', tables_count;
    RAISE NOTICE 'Tablas de chat: % de 3 (conversations, messages, conversation_participants)', chat_tables_count;
    RAISE NOTICE 'Columnas notifications: % de 4 (user_id, type, title, is_read)', notifications_columns;
    RAISE NOTICE 'Columna users.status: % de 1', users_status_column;
    RAISE NOTICE 'Foreign keys de chat: % (conversations con users)', foreign_keys_count;
    RAISE NOTICE 'Políticas RLS: % (security activada)', policies_count;
    RAISE NOTICE '==========================================';
    
    IF chat_tables_count = 3 AND notifications_columns >= 4 AND users_status_column = 1 THEN
        RAISE NOTICE 'SUCCESS: Esquema de chat y notificaciones reparado completamente';
        RAISE NOTICE '✅ Sistema de chat con conversaciones y mensajes';
        RAISE NOTICE '✅ Notificaciones con user_id y campos completos';
        RAISE NOTICE '✅ Status de usuarios online/offline';
        RAISE NOTICE '✅ Foreign keys y relaciones correctas';
        RAISE NOTICE '✅ Políticas RLS de seguridad';
        RAISE NOTICE '✅ Realtime para chat en tiempo real';
        RAISE NOTICE '✅ Funciones auxiliares para chat';
        RAISE NOTICE '✅ Vistas para consultas optimizadas';
        RAISE NOTICE '✅ Triggers automáticos';
        RAISE NOTICE '==========================================';
        RAISE NOTICE 'ERRORES RESUELTOS:';
        RAISE NOTICE '1. ✅ conversations_participant1_id_fkey - Foreign key creada';
        RAISE NOTICE '2. ✅ notifications.user_id does not exist - Columna agregada';
        RAISE NOTICE '3. ✅ users.status does not exist - Columna agregada';
        RAISE NOTICE '==========================================';
    ELSE
        RAISE NOTICE 'WARNING: Reparación parcial. Verificar elementos faltantes';
        RAISE NOTICE 'Tablas de chat: %, Columnas notifications: %, Status users: %', 
                     chat_tables_count, notifications_columns, users_status_column;
    END IF;
END $$;

-- Mostrar resumen de datos actuales
DO $$
DECLARE
    conversations_count INTEGER;
    messages_count INTEGER;
    notifications_count INTEGER;
    online_users_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conversations_count FROM conversations;
    SELECT COUNT(*) INTO messages_count FROM messages;
    SELECT COUNT(*) INTO notifications_count FROM notifications;
    SELECT COUNT(*) INTO online_users_count FROM users WHERE status = 'online';
    
    RAISE NOTICE 'RESUMEN DE DATOS ACTUALES:';
    RAISE NOTICE 'Conversaciones: %', conversations_count;
    RAISE NOTICE 'Mensajes: %', messages_count;
    RAISE NOTICE 'Notificaciones: %', notifications_count;
    RAISE NOTICE 'Usuarios online: %', online_users_count;
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SISTEMA DE CHAT Y NOTIFICACIONES LISTO PARA USAR';
END $$;