-- ===================================
-- SCRIPT COMPLETO DE DIAGNOSTICO Y REPARACION
-- ===================================

BEGIN;

-- 1. VERIFICAR Y CREAR COLUMNAS FALTANTES EN ORDERS
DO $$ 
BEGIN
    -- Columna delivery_address si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE 'Agregada columna delivery_address a orders';
    END IF;

    -- Columna customer_notes si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_notes') THEN
        ALTER TABLE public.orders ADD COLUMN customer_notes TEXT;
        RAISE NOTICE 'Agregada columna customer_notes a orders';
    END IF;

    -- Columna phone_number si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'phone_number') THEN
        ALTER TABLE public.orders ADD COLUMN phone_number TEXT;
        RAISE NOTICE 'Agregada columna phone_number a orders';
    END IF;

    -- Columna customer_name si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
        RAISE NOTICE 'Agregada columna customer_name a orders';
    END IF;

    -- Columna payment_method si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
        RAISE NOTICE 'Agregada columna payment_method a orders';
    END IF;

    -- Columna delivery_type si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type TEXT DEFAULT 'delivery';
        RAISE NOTICE 'Agregada columna delivery_type a orders';
    END IF;

    -- Columna subtotal si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal') THEN
        ALTER TABLE public.orders ADD COLUMN subtotal DECIMAL(10,2);
        RAISE NOTICE 'Agregada columna subtotal a orders';
    END IF;

    -- Columna delivery_fee si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Agregada columna delivery_fee a orders';
    END IF;
END $$;

-- 2. VERIFICAR Y CREAR COLUMNAS FALTANTES EN ORDER_ITEMS
DO $$ 
BEGIN
    -- Columna product_name si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_name') THEN
        ALTER TABLE public.order_items ADD COLUMN product_name TEXT;
        RAISE NOTICE 'Agregada columna product_name a order_items';
    END IF;

    -- Columna product_image si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_image') THEN
        ALTER TABLE public.order_items ADD COLUMN product_image TEXT;
        RAISE NOTICE 'Agregada columna product_image a order_items';
    END IF;

    -- Columna price_per_unit si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        ALTER TABLE public.order_items ADD COLUMN price_per_unit DECIMAL(10,2);
        RAISE NOTICE 'Agregada columna price_per_unit a order_items';
    END IF;

    -- Columna total_price si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2);
        RAISE NOTICE 'Agregada columna total_price a order_items';
    END IF;

    -- Columna notes si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'notes') THEN
        ALTER TABLE public.order_items ADD COLUMN notes TEXT DEFAULT '';
        RAISE NOTICE 'Agregada columna notes a order_items';
    END IF;
END $$;

-- 3. VERIFICAR Y CREAR COLUMNAS FALTANTES EN NOTIFICATIONS
DO $$ 
BEGIN
    -- Columna recipient_id si no existe pero user_id si
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id') 
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id') THEN
        -- Renombrar user_id a recipient_id
        ALTER TABLE public.notifications RENAME COLUMN user_id TO recipient_id;
        RAISE NOTICE 'Renombrada columna user_id a recipient_id en notifications';
    END IF;

    -- Si no existe recipient_id, crearla
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id') THEN
        ALTER TABLE public.notifications ADD COLUMN recipient_id UUID REFERENCES public.users(id);
        RAISE NOTICE 'Agregada columna recipient_id a notifications';
    END IF;

    -- Columna data si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data') THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB;
        RAISE NOTICE 'Agregada columna data a notifications';
    END IF;
END $$;

-- 4. VERIFICAR Y CREAR POLITICAS RLS BASICAS
DO $$
BEGIN
    -- Habilitar RLS en orders si no esta habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' 
        AND t.tablename = 'orders'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado en orders';
    END IF;

    -- Politica basica para orders si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND policyname = 'Users can manage their orders'
    ) THEN
        CREATE POLICY "Users can manage their orders" ON public.orders
        FOR ALL USING (
            auth.uid() = buyer_id OR 
            auth.uid() = seller_id OR 
            auth.uid() = driver_id
        );
        RAISE NOTICE 'Politica basica creada para orders';
    END IF;
END $$;

-- 5. CREAR INDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_driver_id_idx ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);

-- 6. VERIFICAR TABLAS EXISTEN
DO $$
DECLARE
    missing_tables TEXT[] := '{}';
    required_table TEXT;
BEGIN
    -- Lista de tablas requeridas
    FOR required_table IN 
        SELECT unnest(ARRAY['users', 'products', 'orders', 'order_items', 'cart_items', 'notifications'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = required_table
        ) THEN
            missing_tables := array_append(missing_tables, required_table);
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'ATENCION: Tablas faltantes: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE 'Ejecuta el script fix_setup.sql para crear las tablas faltantes';
    ELSE
        RAISE NOTICE 'Todas las tablas principales existen';
    END IF;
END $$;

COMMIT;

-- Verificacion final
SELECT 
    'Diagnostico y reparacion completado' as status,
    'Revisa los mensajes NOTICE anteriores para ver que se configuro' as mensaje;
