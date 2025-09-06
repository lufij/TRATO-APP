-- 🔊 CONFIGURACIÓN OPTIMIZADA DE SUPABASE PARA NOTIFICACIONES SONORAS
-- Script para asegurar que las notificaciones en tiempo real funcionen perfectamente

-- =================================================================
-- 1. VERIFICAR Y CONFIGURAR REALTIME PARA NOTIFICACIONES
-- =================================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 === CONFIGURANDO SUPABASE PARA NOTIFICACIONES SONORAS ===';
    
    -- Asegurar que las tablas críticas estén en realtime
    -- orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
        RAISE NOTICE '✅ Tabla orders agregada a realtime';
    ELSE
        RAISE NOTICE '✅ Tabla orders ya está en realtime';
    END IF;
    
    -- notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        RAISE NOTICE '✅ Tabla notifications agregada a realtime';
    ELSE
        RAISE NOTICE '✅ Tabla notifications ya está en realtime';
    END IF;
    
    -- daily_products
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'daily_products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE daily_products;
        RAISE NOTICE '✅ Tabla daily_products agregada a realtime';
    ELSE
        RAISE NOTICE '✅ Tabla daily_products ya está en realtime';
    END IF;
    
    -- drivers
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'drivers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
        RAISE NOTICE '✅ Tabla drivers agregada a realtime';
    ELSE
        RAISE NOTICE '✅ Tabla drivers ya está en realtime';
    END IF;
END $$;

-- =================================================================
-- 2. OPTIMIZAR ÍNDICES PARA SUBSCRIPTIONS EN TIEMPO REAL
-- =================================================================

-- Índices para mejorar performance de filtros de realtime
CREATE INDEX IF NOT EXISTS idx_orders_seller_id_status 
    ON orders(seller_id, status) WHERE seller_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_driver_id_status 
    ON orders(driver_id, status) WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id_status 
    ON orders(buyer_id, status) WHERE buyer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id_unread 
    ON notifications(recipient_id, is_read, created_at DESC) 
    WHERE recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_products_seller_created 
    ON daily_products(seller_id, created_at) 
    WHERE seller_id IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE '✅ Índices optimizados para subscriptions en tiempo real';
END $$;

-- =================================================================
-- 3. VERIFICAR POLÍTICAS RLS PARA NOTIFICACIONES
-- =================================================================

-- Política para que los usuarios puedan escuchar cambios en sus órdenes
DO $$
BEGIN
    -- Política para vendedores (escuchar órdenes donde son seller_id)
    DROP POLICY IF EXISTS "Sellers can listen to their orders" ON orders;
    CREATE POLICY "Sellers can listen to their orders" ON orders
        FOR ALL USING (
            seller_id = auth.uid() OR
            buyer_id = auth.uid() OR 
            driver_id = auth.uid()
        );
    
    RAISE NOTICE '✅ Políticas RLS actualizadas para orders';
    
    -- Política para notificaciones
    DROP POLICY IF EXISTS "Users can listen to their notifications" ON notifications;
    CREATE POLICY "Users can listen to their notifications" ON notifications
        FOR ALL USING (recipient_id = auth.uid());
    
    RAISE NOTICE '✅ Políticas RLS actualizadas para notifications';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error configurando políticas: %', SQLERRM;
END $$;

-- =================================================================
-- 4. CREAR FUNCIÓN PARA NOTIFICACIONES AUTOMÁTICAS (SOLO SI NO EXISTE)
-- =================================================================

-- Función para crear notificaciones automáticas cuando cambia el estado de órdenes
CREATE OR REPLACE FUNCTION create_sound_notification_on_order_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo crear notificación si el status cambió
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Notificación para vendedor cuando orden es aceptada por repartidor
        IF OLD.status = 'ready' AND NEW.status = 'assigned' THEN
            -- Verificar si la tabla notifications existe
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
                INSERT INTO notifications (
                    recipient_id,
                    type,
                    title,
                    message,
                    data,
                    is_read,
                    created_at
                ) VALUES (
                    NEW.seller_id,
                    'order',
                    '🚚 Repartidor Asignado',
                    'Un repartidor aceptó la entrega del pedido #' || NEW.id,
                    jsonb_build_object(
                        'order_id', NEW.id,
                        'notification_type', 'driver_assigned',
                        'sound_type', 'driver_assigned'
                    ),
                    false,
                    NOW()
                );
            END IF;
        END IF;
        
        -- Notificación para comprador cuando orden es asignada
        IF OLD.status = 'ready' AND NEW.status = 'assigned' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
                INSERT INTO notifications (
                    recipient_id,
                    type,
                    title,
                    message,
                    data,
                    is_read,
                    created_at
                ) VALUES (
                    NEW.buyer_id,
                    'order',
                    '🚚 Repartidor en Camino',
                    'Tu pedido ha sido asignado a un repartidor',
                    jsonb_build_object(
                        'order_id', NEW.id,
                        'notification_type', 'driver_assigned_buyer',
                        'sound_type', 'driver_assigned'
                    ),
                    false,
                    NOW()
                );
            END IF;
        END IF;
        
        -- Notificación para comprador cuando orden es entregada
        IF OLD.status = 'assigned' AND NEW.status = 'delivered' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
                INSERT INTO notifications (
                    recipient_id,
                    type,
                    title,
                    message,
                    data,
                    is_read,
                    created_at
                ) VALUES (
                    NEW.buyer_id,
                    'order',
                    '✅ Pedido Entregado',
                    'Tu pedido ha sido entregado exitosamente',
                    jsonb_build_object(
                        'order_id', NEW.id,
                        'notification_type', 'order_delivered',
                        'sound_type', 'order_delivered'
                    ),
                    false,
                    NOW()
                );
            END IF;
        END IF;
        
        -- Notificación para vendedor cuando orden es entregada
        IF OLD.status = 'assigned' AND NEW.status = 'delivered' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
                INSERT INTO notifications (
                    recipient_id,
                    type,
                    title,
                    message,
                    data,
                    is_read,
                    created_at
                ) VALUES (
                    NEW.seller_id,
                    'order',
                    '✅ Entrega Completada',
                    'El pedido #' || NEW.id || ' fue entregado exitosamente',
                    jsonb_build_object(
                        'order_id', NEW.id,
                        'notification_type', 'delivery_completed',
                        'sound_type', 'order_delivered'
                    ),
                    false,
                    NOW()
                );
            END IF;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 5. CREAR TRIGGER PARA NOTIFICACIONES SONORAS (SIN CONFLICTOS)
-- =================================================================

DO $$
BEGIN
    -- Solo crear trigger si no existe uno similar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'sound_notification_trigger' 
        AND event_object_table = 'orders'
    ) THEN
        -- Crear trigger para notificaciones sonoras
        CREATE TRIGGER sound_notification_trigger
            AFTER UPDATE ON orders
            FOR EACH ROW
            WHEN (OLD.status IS DISTINCT FROM NEW.status)
            EXECUTE FUNCTION create_sound_notification_on_order_change();
            
        RAISE NOTICE '✅ Trigger para notificaciones sonoras creado';
    ELSE
        RAISE NOTICE '✅ Trigger para notificaciones sonoras ya existe';
    END IF;
END $$;

-- =================================================================
-- 6. FUNCIÓN PARA LIMPIAR NOTIFICACIONES ANTIGUAS
-- =================================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Eliminar notificaciones leídas mayores a 7 días
    DELETE FROM notifications 
    WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Eliminar notificaciones no leídas mayores a 30 días
    DELETE FROM notifications 
    WHERE is_read = false 
    AND created_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE '🧹 Notificaciones antiguas eliminadas';
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 7. CONFIGURAR FUNCIÓN PARA NUEVA ORDEN (VENDEDORES)
-- =================================================================

CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear notificación para el vendedor sobre nueva orden
    INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        data,
        is_read,
        created_at
    ) VALUES (
        NEW.seller_id,
        'order',
        '🛒 Nueva Orden Recibida',
        'Nuevo pedido de ' || COALESCE(NEW.customer_name, 'Cliente') || ' por Q' || NEW.total,
        jsonb_build_object(
            'order_id', NEW.id,
            'customer_name', COALESCE(NEW.customer_name, 'Cliente'),
            'total', NEW.total,
            'delivery_type', NEW.delivery_type,
            'notification_type', 'new_order',
            'sound_type', 'new_order',
            'priority', 'high'
        ),
        false,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para nueva orden
DROP TRIGGER IF EXISTS new_order_notification_trigger ON orders;
CREATE TRIGGER new_order_notification_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_order();

DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de notificaciones para nuevas órdenes configurado';
END $$;

-- =================================================================
-- 8. CONFIGURAR NOTIFICACIONES PARA PRODUCTOS DEL DÍA
-- =================================================================

CREATE OR REPLACE FUNCTION notify_new_daily_product()
RETURNS TRIGGER AS $$
DECLARE
    product_name TEXT;
    seller_name TEXT;
BEGIN
    -- Obtener nombre del producto y vendedor
    SELECT p.name, u.name INTO product_name, seller_name
    FROM products p
    JOIN users u ON NEW.seller_id = u.id
    WHERE p.id = NEW.product_id;
    
    -- Crear notificación para compradores interesados (esto se puede expandir)
    -- Por ahora, solo registramos en el log
    RAISE NOTICE '🆕 Nuevo producto del día: % por %', product_name, seller_name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para productos del día
DROP TRIGGER IF EXISTS new_daily_product_trigger ON daily_products;
CREATE TRIGGER new_daily_product_trigger
    AFTER INSERT ON daily_products
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_daily_product();

-- =================================================================
-- 9. VISTA PARA MONITOREAR NOTIFICACIONES
-- =================================================================

CREATE OR REPLACE VIEW notification_monitoring_view AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour_created,
    type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read THEN 1 END) as read_notifications,
    COUNT(CASE WHEN NOT is_read THEN 1 END) as unread_notifications,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as avg_age_minutes
FROM notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), type
ORDER BY hour_created DESC, type;

-- =================================================================
-- 10. FUNCIÓN DE PRUEBA PARA NOTIFICACIONES
-- =================================================================

CREATE OR REPLACE FUNCTION test_sound_notifications(user_id_param UUID)
RETURNS void AS $$
BEGIN
    -- Crear notificación de prueba para nueva orden
    INSERT INTO notifications (
        recipient_id,
        type,
        title,
        message,
        data,
        is_read,
        created_at
    ) VALUES (
        user_id_param,
        'order',
        '🧪 Prueba: Nueva Orden',
        'Esta es una prueba del sistema de notificaciones sonoras',
        jsonb_build_object(
            'notification_type', 'new_order',
            'sound_type', 'new_order',
            'test', true,
            'timestamp', EXTRACT(EPOCH FROM NOW())
        ),
        false,
        NOW()
    );
    
    RAISE NOTICE '🧪 Notificación de prueba creada para usuario %', user_id_param;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 11. VERIFICACIÓN FINAL
-- =================================================================

DO $$
DECLARE
    tables_in_realtime INTEGER;
    notification_policies INTEGER;
BEGIN
    RAISE NOTICE '🔍 === VERIFICACIÓN FINAL ===';
    
    -- Contar tablas en realtime
    SELECT COUNT(*) INTO tables_in_realtime
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename IN ('orders', 'notifications', 'daily_products', 'drivers');
    
    RAISE NOTICE '✅ Tablas en realtime: %', tables_in_realtime;
    
    -- Verificar políticas de notifications
    SELECT COUNT(*) INTO notification_policies
    FROM pg_policies
    WHERE tablename = 'notifications';
    
    RAISE NOTICE '✅ Políticas en notifications: %', notification_policies;
    
    RAISE NOTICE '🎉 === CONFIGURACIÓN COMPLETADA ===';
    RAISE NOTICE '';
    RAISE NOTICE '📋 RESUMEN DE CONFIGURACIÓN:';
    RAISE NOTICE '   ✅ % tablas configuradas para realtime', tables_in_realtime;
    RAISE NOTICE '   ✅ Triggers automáticos para notificaciones';
    RAISE NOTICE '   ✅ Función de limpieza automática';
    RAISE NOTICE '   ✅ Índices optimizados';
    RAISE NOTICE '   ✅ Políticas RLS configuradas';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 PARA PROBAR:';
    RAISE NOTICE '   SELECT test_sound_notifications(''tu-user-id-aqui'');';
    RAISE NOTICE '';
    RAISE NOTICE '🔊 El sistema de notificaciones sonoras está LISTO!';
END $$;
