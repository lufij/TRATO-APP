-- ===================================
-- DIAGNOSTICO SIMPLE PARA CHECKOUT
-- ===================================

BEGIN;

-- 1. Agregar columnas faltantes en orders (método simple)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'delivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

-- 2. Agregar columnas faltantes en order_items (método simple)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 3. Verificar tabla notifications existe
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS básico
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Crear política básica para orders
DROP POLICY IF EXISTS "Users can manage their orders" ON public.orders;
CREATE POLICY "Users can manage their orders" ON public.orders
    FOR ALL USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id OR 
        auth.uid() = driver_id
    );

-- 6. Crear política básica para order_items
DROP POLICY IF EXISTS "Users can access their order items" ON public.order_items;
CREATE POLICY "Users can access their order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_items.order_id 
            AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid() OR o.driver_id = auth.uid())
        )
    );

-- 7. Crear política básica para notifications
DROP POLICY IF EXISTS "Users can access their notifications" ON public.notifications;
CREATE POLICY "Users can access their notifications" ON public.notifications
    FOR ALL USING (recipient_id = auth.uid());

-- 8. Crear índices básicos
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_driver_id_idx ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON public.notifications(recipient_id);

COMMIT;

-- Verificación final simple
SELECT 
    'Reparacion de checkout completada' as status,
    'Todas las columnas y políticas básicas configuradas' as mensaje;
