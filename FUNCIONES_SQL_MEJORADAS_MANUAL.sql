-- APLICAR FUNCIONES SQL MEJORADAS MANUALMENTE
-- =============================================
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. FUNCIÓN PARA COMPLETAR ÓRDENES PICKUP/DINE-IN
CREATE OR REPLACE FUNCTION seller_mark_completed_pickup(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_buyer_id UUID;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        COALESCE(delivery_type, delivery_method),
        buyer_id
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type, v_buyer_id
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'ready' THEN
        RETURN QUERY SELECT false, ('La orden debe estar lista primero. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    IF v_delivery_type NOT IN ('pickup', 'dine-in', 'dine_in') THEN
        RETURN QUERY SELECT false, ('Esta función es solo para pickup o dine-in. Tipo actual: ' || COALESCE(v_delivery_type, 'null'))::TEXT;
        RETURN;
    END IF;
    
    -- Marcar como completado
    UPDATE orders 
    SET 
        status = 'completed',
        delivered_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Crear notificación para el comprador si existe la tabla
    BEGIN
        INSERT INTO notifications (user_id, order_id, message, type, created_at)
        VALUES (v_buyer_id, p_order_id, 'Tu orden ha sido completada exitosamente', 'order_completed', NOW());
    EXCEPTION WHEN OTHERS THEN
        -- Si la tabla notifications no existe, continuar sin error
        NULL;
    END;
    
    RETURN QUERY SELECT true, 'Orden completada exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNCIÓN PARA NOTIFICAR REPARTIDORES
CREATE OR REPLACE FUNCTION notify_drivers_order_ready(
    p_order_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_driver_count INTEGER;
    v_buyer_id UUID;
    v_order_number TEXT;
BEGIN
    -- Obtener información de la orden
    SELECT buyer_id, order_number INTO v_buyer_id, v_order_number
    FROM orders WHERE id = p_order_id;
    
    -- Contar repartidores disponibles  
    SELECT COUNT(*) INTO v_driver_count
    FROM users 
    WHERE role = 'repartidor' AND COALESCE(is_active, true) = true;
    
    IF v_driver_count = 0 THEN
        -- Si no hay repartidores, notificar al cliente que recoja
        BEGIN
            INSERT INTO notifications (user_id, order_id, message, type, created_at)
            VALUES (v_buyer_id, p_order_id, 'No hay repartidores disponibles. Tu orden está lista para recoger en tienda.', 'order_ready', NOW());
        EXCEPTION WHEN OTHERS THEN
            -- Si la tabla notifications no existe, continuar
            NULL;
        END;
        
        RETURN QUERY SELECT false, 'No hay repartidores disponibles. Cliente notificado para pickup.'::TEXT;
        RETURN;
    END IF;
    
    -- Notificar a todos los repartidores activos
    BEGIN
        INSERT INTO notifications (user_id, order_id, message, type, created_at)
        SELECT 
            u.id, 
            p_order_id, 
            'Nueva orden #' || v_order_number || ' disponible para entrega', 
            'order_available',
            NOW()
        FROM users u 
        WHERE u.role = 'repartidor' AND COALESCE(u.is_active, true) = true;
    EXCEPTION WHEN OTHERS THEN
        -- Si la tabla notifications no existe, continuar
        NULL;
    END;
    
    RETURN QUERY SELECT true, ('Notificado a ' || v_driver_count || ' repartidores')::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCIÓN MEJORADA PARA MARCAR READY
CREATE OR REPLACE FUNCTION seller_mark_ready_improved(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_buyer_id UUID;
    v_order_number TEXT;
    v_notification_result RECORD;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        COALESCE(delivery_type, delivery_method),
        buyer_id,
        order_number
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type, v_buyer_id, v_order_number
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'accepted' THEN
        RETURN QUERY SELECT false, ('La orden debe estar aceptada primero. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'ready'
    UPDATE orders 
    SET 
        status = 'ready',
        ready_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Lógica diferente según tipo de entrega
    IF v_delivery_type = 'delivery' THEN
        -- Si es delivery, notificar a repartidores
        SELECT * INTO v_notification_result 
        FROM notify_drivers_order_ready(p_order_id);
        
        RETURN QUERY SELECT true, ('Orden lista para entrega. ' || v_notification_result.message)::TEXT;
    ELSE
        -- Si es pickup o dine-in, notificar al cliente directamente
        BEGIN
            INSERT INTO notifications (user_id, order_id, message, type, created_at)
            VALUES (v_buyer_id, p_order_id, 'Tu orden #' || v_order_number || ' está lista para recoger', 'order_ready', NOW());
        EXCEPTION WHEN OTHERS THEN
            -- Si la tabla notifications no existe, continuar sin error
            NULL;
        END;
        
        RETURN QUERY SELECT true, 'Orden marcada como lista. Cliente notificado para pickup.'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. OTORGAR PERMISOS
GRANT EXECUTE ON FUNCTION seller_mark_completed_pickup(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_drivers_order_ready(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seller_mark_ready_improved(UUID, UUID) TO authenticated;

-- 5. CREAR TABLA DE NOTIFICACIONES SI NO EXISTE
DO $$ 
BEGIN 
    -- Verificar si la tabla existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('order_accepted', 'order_ready', 'order_completed', 'order_available', 'order_assigned')),
            read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Si la tabla existe, agregar columnas faltantes
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            ALTER TABLE notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'order_id') THEN
            ALTER TABLE notifications ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
            ALTER TABLE notifications ADD COLUMN message TEXT NOT NULL DEFAULT '';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
            ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'general';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
            ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT false;
        END IF;
    END IF;
END 
$$;

-- 6. HABILITAR RLS EN NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICA DE SEGURIDAD PARA NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- 8. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 9. VERIFICAR QUE TODO ESTÉ CREADO
SELECT 
    'Funciones creadas exitosamente' as resultado,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('seller_mark_ready_improved', 'seller_mark_completed_pickup', 'notify_drivers_order_ready')
AND routine_schema = 'public';

SELECT 'Tabla notifications creada' as resultado, table_name 
FROM information_schema.tables 
WHERE table_name = 'notifications' AND table_schema = 'public';
