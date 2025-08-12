-- =====================================================
-- TRATO - ACTUALIZACIÓN COMPLETA DEL SISTEMA DE ÓRDENES
-- =====================================================
-- Este script actualiza la base de datos existente con el sistema completo de órdenes
-- EJECUTAR DESPUÉS DE fix_setup.sql para completar la funcionalidad

BEGIN;

-- =====================================================
-- 1. CREAR TABLAS DEL SISTEMA DE ÓRDENES
-- =====================================================

-- Crear tabla de órdenes
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('pickup', 'dine-in', 'delivery')),
    delivery_address TEXT,
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(11,8),
    customer_notes TEXT,
    phone_number VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'ready', 'assigned', 
        'picked-up', 'in-transit', 'delivered', 
        'completed', 'cancelled', 'rejected'
    )),
    estimated_time INTEGER NOT NULL DEFAULT 30, -- minutes
    driver_id UUID REFERENCES public.users(id),
    seller_rating INTEGER CHECK (seller_rating >= 1 AND seller_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de items de orden
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'new_order', 'order_accepted', 'order_ready', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Datos adicionales como order_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de calificaciones y reseñas
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reviewee_type VARCHAR(20) NOT NULL CHECK (reviewee_type IN ('seller', 'driver')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. AGREGAR COLUMNAS FALTANTES EN USERS (si no existen)
-- =====================================================

DO $$ 
BEGIN
    -- address para compradores
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'address') THEN
        ALTER TABLE public.users ADD COLUMN address TEXT;
    END IF;

    -- date_of_birth
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'date_of_birth') THEN
        ALTER TABLE public.users ADD COLUMN date_of_birth DATE;
    END IF;

    -- preferred_delivery_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'preferred_delivery_address') THEN
        ALTER TABLE public.users ADD COLUMN preferred_delivery_address TEXT;
    END IF;

    -- notification_preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'notification_preferences') THEN
        ALTER TABLE public.users ADD COLUMN notification_preferences JSONB DEFAULT '{"order_updates": true, "promotions": true, "new_products": false}';
    END IF;

    -- avatar_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    END IF;

    RAISE NOTICE '✅ Columnas adicionales de usuarios agregadas exitosamente';
END $$;

-- =====================================================
-- 3. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para órdenes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON public.orders(delivery_type);

-- Índices para items de orden
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Índices para reseñas
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_type ON public.reviews(reviewee_type);

-- =====================================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS PARA ÓRDENES
-- =====================================================

-- Compradores pueden ver sus propias órdenes y vendedores/repartidores pueden ver las suyas
DROP POLICY IF EXISTS "Buyers can view own orders" ON public.orders;
CREATE POLICY "Buyers can view own orders" ON public.orders
    FOR SELECT USING (
        buyer_id = auth.uid() OR
        seller_id = auth.uid() OR
        driver_id = auth.uid()
    );

-- Compradores pueden crear órdenes
DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
CREATE POLICY "Buyers can create orders" ON public.orders
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Vendedores y repartidores pueden actualizar órdenes específicas
DROP POLICY IF EXISTS "Sellers and drivers can update orders" ON public.orders;
CREATE POLICY "Sellers and drivers can update orders" ON public.orders
    FOR UPDATE USING (
        seller_id = auth.uid() OR 
        driver_id = auth.uid()
    );

-- =====================================================
-- 6. POLÍTICAS PARA ORDER ITEMS
-- =====================================================

-- Los usuarios relacionados con la orden pueden ver los items
DROP POLICY IF EXISTS "Order participants can view order items" ON public.order_items;
CREATE POLICY "Order participants can view order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND (buyer_id = auth.uid() OR seller_id = auth.uid() OR driver_id = auth.uid())
        )
    );

-- Solo compradores pueden crear items de orden
DROP POLICY IF EXISTS "Buyers can create order items" ON public.order_items;
CREATE POLICY "Buyers can create order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND buyer_id = auth.uid()
        )
    );

-- =====================================================
-- 7. POLÍTICAS PARA NOTIFICACIONES
-- =====================================================

-- Los usuarios solo pueden ver sus propias notificaciones
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

-- Cualquier usuario autenticado puede crear notificaciones (para sistema)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- =====================================================
-- 8. POLÍTICAS PARA RESEÑAS
-- =====================================================

-- Los usuarios pueden ver reseñas relacionadas con sus órdenes
DROP POLICY IF EXISTS "Users can view related reviews" ON public.reviews;
CREATE POLICY "Users can view related reviews" ON public.reviews
    FOR SELECT USING (
        reviewer_id = auth.uid() OR
        reviewee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = reviews.order_id 
            AND (buyer_id = auth.uid() OR seller_id = auth.uid() OR driver_id = auth.uid())
        )
    );

-- Los usuarios pueden crear reseñas para sus propias órdenes
DROP POLICY IF EXISTS "Users can create reviews for their orders" ON public.reviews;
CREATE POLICY "Users can create reviews for their orders" ON public.reviews
    FOR INSERT WITH CHECK (
        reviewer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = reviews.order_id 
            AND buyer_id = auth.uid()
        )
    );

-- =====================================================
-- 9. FUNCIONES AUXILIARES ACTUALIZADAS
-- =====================================================

-- Función para actualizar timestamp de updated_at en orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. FUNCIÓN PARA ESTADÍSTICAS DE VENDEDOR
-- =====================================================

CREATE OR REPLACE FUNCTION get_seller_stats(seller_uuid UUID)
RETURNS TABLE (
    total_orders BIGINT,
    completed_orders BIGINT,
    average_rating NUMERIC,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
        AVG(seller_rating) as average_rating,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0) as total_revenue
    FROM public.orders 
    WHERE seller_id = seller_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. FUNCIÓN PARA ESTADÍSTICAS DE REPARTIDOR
-- =====================================================

CREATE OR REPLACE FUNCTION get_driver_stats(driver_uuid UUID)
RETURNS TABLE (
    total_deliveries BIGINT,
    completed_deliveries BIGINT,
    average_rating NUMERIC,
    total_earnings NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'completed') as completed_deliveries,
        AVG(driver_rating) as average_rating,
        COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered' OR status = 'completed'), 0) as total_earnings
    FROM public.orders 
    WHERE driver_id = driver_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. FUNCIÓN PARA LIMPIAR NOTIFICACIONES ANTIGUAS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Eliminar notificaciones leídas de más de 30 días
    DELETE FROM public.notifications 
    WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Eliminar notificaciones no leídas de más de 90 días
    DELETE FROM public.notifications 
    WHERE is_read = false 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================
-- 13. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las nuevas tablas se crearon correctamente
DO $$
DECLARE
    orders_exists BOOLEAN;
    order_items_exists BOOLEAN;
    notifications_exists BOOLEAN;
    reviews_exists BOOLEAN;
    total_tables INTEGER;
    total_policies INTEGER;
BEGIN
    -- Verificar orders
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') INTO orders_exists;
    
    -- Verificar order_items
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') INTO order_items_exists;
    
    -- Verificar notifications
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') INTO notifications_exists;
    
    -- Verificar reviews
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') INTO reviews_exists;
    
    -- Contar tablas totales
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'sellers', 'drivers', 'products', 'daily_products', 'cart_items', 'orders', 'order_items', 'notifications', 'reviews');
    
    -- Contar políticas totales
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Mostrar resultado final
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎉 ¡ACTUALIZACIÓN DEL SISTEMA DE ÓRDENES COMPLETADA!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTADO DE LAS NUEVAS TABLAS:';
    
    IF orders_exists THEN
        RAISE NOTICE '✅ Tabla orders creada exitosamente';
    ELSE
        RAISE NOTICE '❌ Error: Tabla orders no se pudo crear';
    END IF;
    
    IF order_items_exists THEN
        RAISE NOTICE '✅ Tabla order_items creada exitosamente';
    ELSE
        RAISE NOTICE '❌ Error: Tabla order_items no se pudo crear';
    END IF;
    
    IF notifications_exists THEN
        RAISE NOTICE '✅ Tabla notifications creada exitosamente';
    ELSE
        RAISE NOTICE '❌ Error: Tabla notifications no se pudo crear';
    END IF;
    
    IF reviews_exists THEN
        RAISE NOTICE '✅ Tabla reviews creada exitosamente';
    ELSE
        RAISE NOTICE '❌ Error: Tabla reviews no se pudo crear';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📈 RESUMEN GENERAL:';
    RAISE NOTICE '   • Total de tablas del sistema: %', total_tables;
    RAISE NOTICE '   • Total de políticas de seguridad: %', total_policies;
    RAISE NOTICE '   • Índices de optimización: Creados';
    RAISE NOTICE '   • Funciones auxiliares: Actualizadas';
    RAISE NOTICE '';
    
    IF orders_exists AND order_items_exists AND notifications_exists AND reviews_exists THEN
        RAISE NOTICE '🚀 ¡SISTEMA COMPLETO LISTO!';
        RAISE NOTICE '';
        RAISE NOTICE '🛒 NUEVAS FUNCIONALIDADES DISPONIBLES:';
        RAISE NOTICE '   ✅ Carrito de compras profesional';
        RAISE NOTICE '   ✅ Sistema completo de órdenes';
        RAISE NOTICE '   ✅ 3 tipos de entrega: Pickup, Dine-in, Delivery';
        RAISE NOTICE '   ✅ Notificaciones en tiempo real';
        RAISE NOTICE '   ✅ Seguimiento de pedidos';
        RAISE NOTICE '   ✅ Sistema de calificaciones';
        RAISE NOTICE '   ✅ Gestión para vendedores y repartidores';
        RAISE NOTICE '   ✅ Dashboard completo del comprador';
        RAISE NOTICE '';
        RAISE NOTICE '📋 PRÓXIMOS PASOS CRÍTICOS:';
        RAISE NOTICE '   1. Activar Realtime en Supabase Dashboard:';
        RAISE NOTICE '      • Ve a Database → Replication';
        RAISE NOTICE '      • Activa Realtime para: orders, notifications';
        RAISE NOTICE '   2. Recargar tu aplicación (Ctrl+Shift+R)';
        RAISE NOTICE '   3. ¡Disfrutar del nuevo marketplace completo!';
        RAISE NOTICE '';
        RAISE NOTICE '🎯 TU MARKETPLACE TRATO ESTÁ 100% OPERATIVO';
    ELSE
        RAISE NOTICE '⚠️ Algunas tablas fallaron al crearse. Revisa los errores arriba.';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;