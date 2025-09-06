-- 🔍 VERIFICAR CONFIGURACIÓN ACTUAL DE SUPABASE PARA NOTIFICACIONES

-- =================================================================
-- 1. VERIFICAR TABLAS EN REALTIME
-- =================================================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '🔍 === VERIFICANDO CONFIGURACIÓN REALTIME ===';
    
    RAISE NOTICE 'Tablas actualmente en realtime:';
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime'
        ORDER BY tablename
    LOOP
        RAISE NOTICE '  ✅ %.%', table_record.schemaname, table_record.tablename;
    END LOOP;
    
    -- Verificar tablas específicas necesarias
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
        RAISE NOTICE '✅ orders está en realtime';
    ELSE
        RAISE NOTICE '❌ orders NO está en realtime';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        RAISE NOTICE '✅ notifications está en realtime';
    ELSE
        RAISE NOTICE '❌ notifications NO está en realtime';
    END IF;
    
END $$;

-- =================================================================
-- 2. VERIFICAR ÍNDICES EXISTENTES
-- =================================================================

DO $$
DECLARE
    index_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 === VERIFICANDO ÍNDICES ===';
    
    -- Índices en orders
    RAISE NOTICE 'Índices en tabla orders:';
    FOR index_record IN 
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'orders' 
        AND schemaname = 'public'
        ORDER BY indexname
    LOOP
        RAISE NOTICE '  📊 %', index_record.indexname;
    END LOOP;
    
    -- Índices en notifications
    RAISE NOTICE 'Índices en tabla notifications:';
    FOR index_record IN 
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'notifications' 
        AND schemaname = 'public'
        ORDER BY indexname
    LOOP
        RAISE NOTICE '  📊 %', index_record.indexname;
    END LOOP;
    
END $$;

-- =================================================================
-- 3. VERIFICAR TRIGGERS EXISTENTES
-- =================================================================

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ === VERIFICANDO TRIGGERS ===';
    
    -- Triggers en orders
    RAISE NOTICE 'Triggers en tabla orders:';
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'orders'
        AND trigger_schema = 'public'
        ORDER BY trigger_name
    LOOP
        RAISE NOTICE '  ⚙️ % (% %)', trigger_record.trigger_name, trigger_record.action_timing, trigger_record.event_manipulation;
    END LOOP;
    
    -- Triggers en daily_products
    RAISE NOTICE 'Triggers en tabla daily_products:';
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'daily_products'
        AND trigger_schema = 'public'
        ORDER BY trigger_name
    LOOP
        RAISE NOTICE '  ⚙️ % (% %)', trigger_record.trigger_name, trigger_record.action_timing, trigger_record.event_manipulation;
    END LOOP;
    
END $$;

-- =================================================================
-- 4. VERIFICAR POLÍTICAS RLS
-- =================================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 === VERIFICANDO POLÍTICAS RLS ===';
    
    -- Políticas en orders
    RAISE NOTICE 'Políticas RLS en orders:';
    FOR policy_record IN 
        SELECT policyname, permissive, cmd
        FROM pg_policies 
        WHERE tablename = 'orders'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  🔒 % (% %)', policy_record.policyname, policy_record.permissive, policy_record.cmd;
    END LOOP;
    
    -- Políticas en notifications
    RAISE NOTICE 'Políticas RLS en notifications:';
    FOR policy_record IN 
        SELECT policyname, permissive, cmd
        FROM pg_policies 
        WHERE tablename = 'notifications'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  🔒 % (% %)', policy_record.policyname, policy_record.permissive, policy_record.cmd;
    END LOOP;
    
END $$;

-- =================================================================
-- 5. VERIFICAR FUNCIONES PERSONALIZADAS
-- =================================================================

DO $$
DECLARE
    function_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 === VERIFICANDO FUNCIONES PERSONALIZADAS ===';
    
    -- Funciones relacionadas con notificaciones
    FOR function_record IN 
        SELECT proname, pronargs
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname LIKE '%notification%'
        ORDER BY proname
    LOOP
        RAISE NOTICE '  🔧 %(%)', function_record.proname, function_record.pronargs;
    END LOOP;
    
END $$;

-- =================================================================
-- 6. VERIFICAR ESTRUCTURA DE TABLA NOTIFICATIONS
-- =================================================================

DO $$
DECLARE
    column_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 === ESTRUCTURA DE TABLA NOTIFICATIONS ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabla notifications existe:';
        FOR column_record IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  📋 %: % (%)', 
                column_record.column_name, 
                column_record.data_type,
                CASE WHEN column_record.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ Tabla notifications NO existe';
    END IF;
    
END $$;

-- =================================================================
-- 7. CONTAR NOTIFICACIONES ACTUALES
-- =================================================================

DO $$
DECLARE
    total_notifications INTEGER := 0;
    unread_notifications INTEGER := 0;
    recent_notifications INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 === ESTADÍSTICAS DE NOTIFICACIONES ===';
    
    -- Solo si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        
        SELECT COUNT(*) INTO total_notifications FROM notifications;
        SELECT COUNT(*) INTO unread_notifications FROM notifications WHERE is_read = false;
        SELECT COUNT(*) INTO recent_notifications FROM notifications WHERE created_at >= NOW() - INTERVAL '24 hours';
        
        RAISE NOTICE '📊 Total notificaciones: %', total_notifications;
        RAISE NOTICE '📊 Notificaciones no leídas: %', unread_notifications;
        RAISE NOTICE '📊 Notificaciones últimas 24h: %', recent_notifications;
        
        -- Notificaciones por tipo
        FOR column_record IN 
            SELECT type, COUNT(*) as count
            FROM notifications 
            GROUP BY type 
            ORDER BY count DESC
        LOOP
            RAISE NOTICE '📊 Tipo "%": % notificaciones', column_record.type, column_record.count;
        END LOOP;
        
    ELSE
        RAISE NOTICE '⚠️ No se pueden obtener estadísticas - tabla notifications no existe';
    END IF;
    
END $$;

-- =================================================================
-- 8. RESUMEN DE ESTADO
-- =================================================================

DO $$
DECLARE
    orders_realtime BOOLEAN := FALSE;
    notifications_realtime BOOLEAN := FALSE;
    notifications_table_exists BOOLEAN := FALSE;
    triggers_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 === RESUMEN DE ESTADO ===';
    
    -- Verificar realtime
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) INTO orders_realtime;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) INTO notifications_realtime;
    
    -- Verificar tabla notifications
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications' AND table_schema = 'public'
    ) INTO notifications_table_exists;
    
    -- Contar triggers
    SELECT COUNT(*) INTO triggers_count
    FROM information_schema.triggers 
    WHERE event_object_table IN ('orders', 'daily_products', 'notifications')
    AND trigger_schema = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 ESTADO PARA NOTIFICACIONES SONORAS:';
    RAISE NOTICE '   Orders realtime: %', CASE WHEN orders_realtime THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   Notifications realtime: %', CASE WHEN notifications_realtime THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   Tabla notifications: %', CASE WHEN notifications_table_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   Triggers configurados: %', triggers_count;
    RAISE NOTICE '';
    
    IF orders_realtime AND (notifications_realtime OR NOT notifications_table_exists) AND triggers_count > 0 THEN
        RAISE NOTICE '🎉 ¡CONFIGURACIÓN ÓPTIMA PARA NOTIFICACIONES SONORAS!';
        RAISE NOTICE '   ✅ Las notificaciones en tiempo real funcionarán correctamente';
        RAISE NOTICE '   ✅ Los sonidos se activarán automáticamente';
    ELSE
        RAISE NOTICE '⚠️ CONFIGURACIÓN NECESARIA:';
        IF NOT orders_realtime THEN
            RAISE NOTICE '   🔧 Ejecutar: ALTER PUBLICATION supabase_realtime ADD TABLE orders;';
        END IF;
        IF NOT notifications_realtime AND notifications_table_exists THEN
            RAISE NOTICE '   🔧 Ejecutar: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;';
        END IF;
        IF triggers_count = 0 THEN
            RAISE NOTICE '   🔧 Ejecutar el script CONFIGURAR_SUPABASE_SONIDOS.sql';
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📌 SIGUIENTE PASO:';
    RAISE NOTICE '   Si hay configuraciones faltantes, ejecuta:';
    RAISE NOTICE '   \i CONFIGURAR_SUPABASE_SONIDOS.sql';
    
END $$;
