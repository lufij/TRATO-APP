-- TRATO - CREAR TABLAS Y SISTEMA DE ORDENES COMPLETO
-- Este script crea todas las tablas necesarias

BEGIN;

-- 1. CREAR TABLA NOTIFICATIONS SI NO EXISTE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AGREGAR COLUMNAS FALTANTES A ORDERS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'accepted_at') THEN
        ALTER TABLE public.orders ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'ready_at') THEN
        ALTER TABLE public.orders ADD COLUMN ready_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'picked_up_at') THEN
        ALTER TABLE public.orders ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE public.orders ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.orders ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- 3. AGREGAR COLUMNAS A ORDER_ITEMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        ALTER TABLE public.order_items ADD COLUMN price_per_unit DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- 4. FUNCION PRINCIPAL PARA CAMBIAR ESTADO DE ORDEN
CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_new_status TEXT,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    order_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_buyer_name TEXT;
    v_seller_name TEXT;
BEGIN
    -- Obtener informacion de la orden
    SELECT o.*, 
           bu.name AS buyer_name,
           se.name AS seller_name,
           se.business_name AS seller_business
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.users bu ON o.buyer_id = bu.id
    LEFT JOIN public.users se ON o.seller_id = se.id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Actualizar el estado de la orden
    UPDATE public.orders 
    SET status = p_new_status,
        updated_at = NOW(),
        accepted_at = CASE WHEN p_new_status = 'accepted' THEN NOW() ELSE accepted_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END,
        picked_up_at = CASE WHEN p_new_status = 'picked-up' THEN NOW() ELSE picked_up_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        driver_id = CASE WHEN p_new_status = 'assigned' THEN p_user_id ELSE driver_id END,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_notes ELSE rejection_reason END
    WHERE id = p_order_id;

    -- Variables para notificaciones
    v_buyer_name := v_order.buyer_name;
    v_seller_name := COALESCE(v_order.seller_business, v_order.seller_name);

    -- Crear notificaciones segun el estado
    IF p_new_status = 'accepted' THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.buyer_id,
            'order_accepted',
            'Pedido aceptado',
            v_seller_name || ' ha aceptado tu pedido',
            jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
        );
    ELSIF p_new_status = 'rejected' THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.buyer_id,
            'order_rejected',
            'Pedido rechazado',
            'Tu pedido ha sido rechazado',
            jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
        );
    ELSIF p_new_status = 'ready' THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.buyer_id,
            'order_ready',
            'Pedido listo',
            'Tu pedido esta listo',
            jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
        );
    ELSIF p_new_status = 'delivered' THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, data)
        VALUES (
            v_order.buyer_id,
            'order_delivered',
            'Pedido entregado',
            'Tu pedido ha sido entregado',
            jsonb_build_object('order_id', p_order_id, 'status', p_new_status)
        );
    END IF;

    -- Retornar resultado
    RETURN QUERY SELECT 
        true,
        'Estado actualizado exitosamente'::TEXT,
        jsonb_build_object('order_id', p_order_id, 'new_status', p_new_status);
END;
$$;

-- 5. FUNCION PARA ASIGNAR REPARTIDOR
CREATE OR REPLACE FUNCTION public.assign_driver_to_order(
    p_order_id UUID,
    p_driver_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.orders 
    SET driver_id = p_driver_id, 
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_order_id AND status = 'ready';

    IF FOUND THEN
        RETURN QUERY SELECT true, 'Repartidor asignado exitosamente'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'Orden no disponible'::TEXT;
    END IF;
END;
$$;

-- 6. FUNCION PARA OBTENER ENTREGAS DISPONIBLES
CREATE OR REPLACE FUNCTION public.get_available_deliveries()
RETURNS TABLE (
    order_id UUID,
    seller_name TEXT,
    delivery_address TEXT,
    total DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        COALESCE(u.business_name, u.name),
        o.delivery_address,
        o.total,
        o.created_at
    FROM public.orders o
    LEFT JOIN public.users u ON o.seller_id = u.id
    WHERE o.status = 'ready' 
    AND o.delivery_type = 'delivery'
    AND o.driver_id IS NULL
    ORDER BY o.created_at ASC;
END;
$$;

-- 7. FUNCION PARA MARCAR NOTIFICACION COMO LEIDA
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications 
    SET is_read = true 
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$;

-- 8. PERMISOS
GRANT EXECUTE ON FUNCTION public.update_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_driver_to_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_deliveries TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;

-- 9. RLS Y POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policy para notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR ALL USING (auth.uid() = recipient_id);

-- Policy para orders
DROP POLICY IF EXISTS "Users can view their orders" ON public.orders;
CREATE POLICY "Users can view their orders" ON public.orders
    FOR ALL USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id OR 
        auth.uid() = driver_id
    );

-- Policy para order_items
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
CREATE POLICY "Users can view order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_id AND (
                auth.uid() = o.buyer_id OR 
                auth.uid() = o.seller_id OR 
                auth.uid() = o.driver_id
            )
        )
    );

COMMIT;

SELECT 'Sistema completo con tablas creado exitosamente' as status;
