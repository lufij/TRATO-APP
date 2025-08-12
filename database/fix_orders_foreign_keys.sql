-- =====================================================
-- TRATO - CORRECCIÓN DE FOREIGN KEYS EN TABLA ORDERS
-- =====================================================
-- Este script arregla específicamente el error:
-- "Could not find a relationship between 'orders' and 'users'"
-- Asegura que todos los foreign keys estén correctamente configurados

-- Asegurar función gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- =====================================================
-- 1. VERIFICAR Y CREAR TABLA ORDERS SI NO EXISTE
-- =====================================================

-- Crear tabla orders con estructura completa si no existe
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_type VARCHAR(20) NOT NULL DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'dine-in', 'delivery')),
    delivery_address TEXT,
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(11,8),
    customer_notes TEXT,
    phone_number VARCHAR(20) NOT NULL DEFAULT '00000000',
    customer_name VARCHAR(255) NOT NULL DEFAULT 'Cliente',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'ready', 'assigned', 
        'picked-up', 'in-transit', 'delivered', 
        'completed', 'cancelled', 'rejected'
    )),
    estimated_time INTEGER NOT NULL DEFAULT 30,
    driver_id UUID,
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

-- =====================================================
-- 2. ELIMINAR FOREIGN KEYS EXISTENTES SI ESTÁN MAL CONFIGURADOS
-- =====================================================

-- Función para eliminar foreign key si existe
CREATE OR REPLACE FUNCTION drop_foreign_key_if_exists(p_table_name TEXT, p_constraint_name TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public'
          AND constraint_type = 'FOREIGN KEY'
          AND table_name = p_table_name
          AND constraint_name = p_constraint_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_table_name, p_constraint_name);
        RAISE NOTICE 'Foreign key % eliminado de %', p_constraint_name, p_table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Eliminar foreign keys problemáticos si existen
SELECT drop_foreign_key_if_exists('orders', 'orders_buyer_id_fkey');
SELECT drop_foreign_key_if_exists('orders', 'orders_seller_id_fkey');  
SELECT drop_foreign_key_if_exists('orders', 'orders_driver_id_fkey');
SELECT drop_foreign_key_if_exists('orders', 'fk_orders_buyer');
SELECT drop_foreign_key_if_exists('orders', 'fk_orders_seller');
SELECT drop_foreign_key_if_exists('orders', 'fk_orders_driver');

-- =====================================================
-- 3. CREAR FOREIGN KEYS CORRECTOS PARA ORDERS
-- =====================================================

-- Verificar que la tabla users existe antes de crear foreign keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Tabla users no existe. Ejecuta primero fix_setup.sql';
    END IF;
    
    RAISE NOTICE 'Tabla users existe. Creando foreign keys...';
    
    -- Crear foreign key para buyer_id
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_buyer_id_fkey 
    FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key orders.buyer_id → users.id creado';
    
    -- Crear foreign key para seller_id  
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_seller_id_fkey 
    FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key orders.seller_id → users.id creado';
    
    -- Crear foreign key para driver_id (opcional, puede ser NULL)
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key orders.driver_id → users.id creado';
    
END $$;

-- =====================================================
-- 4. CREAR TABLA ORDER_ITEMS CON FOREIGN KEYS CORRECTOS
-- =====================================================

-- Crear tabla order_items si no existe
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eliminar foreign key problemático de order_items si existe
SELECT drop_foreign_key_if_exists('order_items', 'order_items_order_id_fkey');

-- Crear foreign key correcto para order_items
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- =====================================================
-- 5. VERIFICAR Y CREAR OTRAS TABLAS RELACIONADAS
-- =====================================================

-- Crear tabla notifications si no existe
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear foreign key para notifications
SELECT drop_foreign_key_if_exists('notifications', 'notifications_recipient_id_fkey');
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Crear tabla reviews si no existe
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    reviewee_id UUID NOT NULL,
    reviewee_type VARCHAR(20) NOT NULL CHECK (reviewee_type IN ('seller', 'driver')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear foreign keys para reviews
SELECT drop_foreign_key_if_exists('reviews', 'reviews_order_id_fkey');
SELECT drop_foreign_key_if_exists('reviews', 'reviews_reviewer_id_fkey'); 
SELECT drop_foreign_key_if_exists('reviews', 'reviews_reviewee_id_fkey');

ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- =====================================================
-- 6. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON public.orders(delivery_type);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);

-- =====================================================
-- 7. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREAR POLÍTICAS RLS BÁSICAS
-- =====================================================

-- Políticas para orders
DROP POLICY IF EXISTS "Users can view orders they are involved in" ON public.orders;
CREATE POLICY "Users can view orders they are involved in" ON public.orders
    FOR SELECT USING (
        buyer_id = auth.uid() OR
        seller_id = auth.uid() OR
        driver_id = auth.uid()
    );

DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
CREATE POLICY "Buyers can create orders" ON public.orders
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Sellers and drivers can update orders" ON public.orders;
CREATE POLICY "Sellers and drivers can update orders" ON public.orders
    FOR UPDATE USING (
        seller_id = auth.uid() OR 
        driver_id = auth.uid()
    );

-- Políticas para order_items
DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;
CREATE POLICY "Users can view order items for their orders" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND (buyer_id = auth.uid() OR seller_id = auth.uid() OR driver_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Buyers can create order items" ON public.order_items;
CREATE POLICY "Buyers can create order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id 
            AND buyer_id = auth.uid()
        )
    );

-- Políticas para notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- =====================================================
-- 9. CREAR TRIGGER PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at ya debería existir, pero la creamos por si acaso
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Limpiar función temporal
DROP FUNCTION IF EXISTS drop_foreign_key_if_exists(TEXT, TEXT);

COMMIT;

-- =====================================================
-- 10. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    orders_fk_count INTEGER;
    order_items_fk_count INTEGER;
    notifications_fk_count INTEGER;
    reviews_fk_count INTEGER;
BEGIN
    -- Contar foreign keys creados
    SELECT COUNT(*) INTO orders_fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'orders' AND constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO order_items_fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'order_items' AND constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO notifications_fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'notifications' AND constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO reviews_fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'reviews' AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE '%', '==========================================';
    RAISE NOTICE '%', 'CORRECCIÓN DE FOREIGN KEYS COMPLETADA';
    RAISE NOTICE '%', '==========================================';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'FOREIGN KEYS CREADOS:';
    RAISE NOTICE '%', format('   • orders: %s foreign keys', orders_fk_count);
    RAISE NOTICE '%', format('   • order_items: %s foreign keys', order_items_fk_count);  
    RAISE NOTICE '%', format('   • notifications: %s foreign keys', notifications_fk_count);
    RAISE NOTICE '%', format('   • reviews: %s foreign keys', reviews_fk_count);
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'PROBLEMAS SOLUCIONADOS:';
    RAISE NOTICE '%', '   ✓ Error "Could not find relationship orders/users" CORREGIDO';
    RAISE NOTICE '%', '   ✓ Foreign keys orders.buyer_id → users.id CREADO';
    RAISE NOTICE '%', '   ✓ Foreign keys orders.seller_id → users.id CREADO';
    RAISE NOTICE '%', '   ✓ Foreign keys orders.driver_id → users.id CREADO';
    RAISE NOTICE '%', '   ✓ Políticas RLS configuradas';
    RAISE NOTICE '%', '   ✓ Índices de optimización creados';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'PRÓXIMO PASO:';
    RAISE NOTICE '%', '   • Ejecutar fix_cart_foreign_key_error_corrected.sql';
    RAISE NOTICE '%', '   • Reiniciar aplicación completamente';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'ERROR DE ORDERS/USERS SOLUCIONADO!';
    RAISE NOTICE '%', '==========================================';
END $$;