-- ============================================================================
-- TRATO - Verificación de Corrección de Chat y Notificaciones
-- ============================================================================
-- Este script verifica que los errores han sido corregidos correctamente
-- ============================================================================

DO $$
DECLARE
    notifications_exists BOOLEAN := FALSE;
    conversations_exists BOOLEAN := FALSE;
    messages_exists BOOLEAN := FALSE;
    recipient_id_exists BOOLEAN := FALSE;
    user_id_exists BOOLEAN := FALSE;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO CORRECCIÓN DE ERRORES...';
    RAISE NOTICE '';
    
    -- Verificar tabla notifications
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) INTO notifications_exists;
    
    IF notifications_exists THEN
        RAISE NOTICE '✅ Tabla notifications: EXISTE';
        
        -- Verificar columna recipient_id
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'recipient_id'
        ) INTO recipient_id_exists;
        
        -- Verificar si aún existe user_id (no debería)
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'user_id'
        ) INTO user_id_exists;
        
        IF recipient_id_exists THEN
            RAISE NOTICE '✅ Columna notifications.recipient_id: EXISTE';
        ELSE
            RAISE NOTICE '❌ Columna notifications.recipient_id: NO EXISTE';
            error_count := error_count + 1;
        END IF;
        
        IF user_id_exists THEN
            RAISE NOTICE '⚠️  Columna notifications.user_id: AÚN EXISTE (debería ser recipient_id)';
            error_count := error_count + 1;
        ELSE
            RAISE NOTICE '✅ Columna notifications.user_id: CORRECTAMENTE REMOVIDA';
        END IF;
    ELSE
        RAISE NOTICE '❌ Tabla notifications: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE '';
    
    -- Verificar tabla conversations
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'conversations'
    ) INTO conversations_exists;
    
    IF conversations_exists THEN
        RAISE NOTICE '✅ Tabla conversations: EXISTE';
    ELSE
        RAISE NOTICE '❌ Tabla conversations: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    -- Verificar tabla messages
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'messages'
    ) INTO messages_exists;
    
    IF messages_exists THEN
        RAISE NOTICE '✅ Tabla messages: EXISTE';
    ELSE
        RAISE NOTICE '❌ Tabla messages: NO EXISTE';
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN DE VERIFICACIÓN:';
    
    IF error_count = 0 THEN
        RAISE NOTICE '🎉 ¡TODOS LOS ERRORES HAN SIDO CORREGIDOS!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ La aplicación TRATO debería funcionar correctamente ahora.';
        RAISE NOTICE '🔄 Recarga la aplicación para confirmar que los errores desaparecieron.';
    ELSE
        RAISE NOTICE '⚠️  Se encontraron % errores pendientes.', error_count;
        RAISE NOTICE '🔧 Ejecuta nuevamente el script fix_chat_notifications_errors.sql';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 ESTADO ACTUAL:';
    RAISE NOTICE '   • notifications table: %', CASE WHEN notifications_exists THEN 'OK' ELSE 'MISSING' END;
    RAISE NOTICE '   • notifications.recipient_id: %', CASE WHEN recipient_id_exists THEN 'OK' ELSE 'MISSING' END;
    RAISE NOTICE '   • conversations table: %', CASE WHEN conversations_exists THEN 'OK' ELSE 'MISSING' END;
    RAISE NOTICE '   • messages table: %', CASE WHEN messages_exists THEN 'OK' ELSE 'MISSING' END;
    
END $$;

-- Test rápido de consultas que estaban fallando
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 PROBANDO CONSULTAS QUE ESTABAN FALLANDO...';
    
    BEGIN
        -- Test query notifications
        PERFORM COUNT(*) FROM notifications;
        RAISE NOTICE '✅ Query notifications: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Query notifications: ERROR - %', SQLERRM;
    END;
    
    BEGIN
        -- Test query conversations
        PERFORM COUNT(*) FROM conversations;
        RAISE NOTICE '✅ Query conversations: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Query conversations: ERROR - %', SQLERRM;
    END;
    
    BEGIN
        -- Test query messages
        PERFORM COUNT(*) FROM messages;
        RAISE NOTICE '✅ Query messages: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Query messages: ERROR - %', SQLERRM;
    END;
END $$;