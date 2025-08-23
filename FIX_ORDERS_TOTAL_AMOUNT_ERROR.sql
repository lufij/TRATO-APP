-- 🚨 SOLUCION DEFINITIVA PARA ERROR DE ORDENES
-- Ejecuta este script para resolver el error "null value in column 'total_amount'"

BEGIN;

-- =====================================================
-- 1. VERIFICAR Y CORREGIR ESTRUCTURA DE TABLA ORDERS
-- =====================================================

-- Agregar columnas faltantes en orders
DO $$ 
BEGIN
    -- total_amount (columna principal requerida)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount') THEN
        ALTER TABLE public.orders ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ Columna total_amount agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna total_amount ya existe en orders';
    END IF;

    -- subtotal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal') THEN
        ALTER TABLE public.orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna subtotal agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna subtotal ya existe en orders';
    END IF;

    -- delivery_fee
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna delivery_fee agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna delivery_fee ya existe en orders';
    END IF;

    -- total (alias de total_amount)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total') THEN
        ALTER TABLE public.orders ADD COLUMN total DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna total agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna total ya existe en orders';
    END IF;

    -- delivery_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'delivery', 'dine-in'));
        RAISE NOTICE '✅ Columna delivery_type agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna delivery_type ya existe en orders';
    END IF;

    -- delivery_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE '✅ Columna delivery_address agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna delivery_address ya existe en orders';
    END IF;

    -- customer_notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_notes') THEN
        ALTER TABLE public.orders ADD COLUMN customer_notes TEXT;
        RAISE NOTICE '✅ Columna customer_notes agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna customer_notes ya existe en orders';
    END IF;

    -- phone_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'phone_number') THEN
        ALTER TABLE public.orders ADD COLUMN phone_number VARCHAR(20);
        RAISE NOTICE '✅ Columna phone_number agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna phone_number ya existe en orders';
    END IF;

    -- customer_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name VARCHAR(100);
        RAISE NOTICE '✅ Columna customer_name agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna customer_name ya existe en orders';
    END IF;

    -- payment_method
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer'));
        RAISE NOTICE '✅ Columna payment_method agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna payment_method ya existe en orders';
    END IF;
END $$;

-- =====================================================
-- 2. VERIFICAR Y CORREGIR ESTRUCTURA DE TABLA ORDER_ITEMS
-- =====================================================

DO $$ 
BEGIN
    -- price (precio unitario)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price') THEN
        ALTER TABLE public.order_items ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna price agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna price ya existe en order_items';
    END IF;

    -- product_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_name') THEN
        ALTER TABLE public.order_items ADD COLUMN product_name VARCHAR(255);
        RAISE NOTICE '✅ Columna product_name agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna product_name ya existe en order_items';
    END IF;

    -- product_image
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_image') THEN
        ALTER TABLE public.order_items ADD COLUMN product_image TEXT;
        RAISE NOTICE '✅ Columna product_image agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna product_image ya existe en order_items';
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'notes') THEN
        ALTER TABLE public.order_items ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Columna notes agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna notes ya existe en order_items';
    END IF;
END $$;

-- =====================================================
-- 3. CREAR TRIGGER PARA SINCRONIZAR TOTAL Y TOTAL_AMOUNT
-- =====================================================

CREATE OR REPLACE FUNCTION sync_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se actualiza total, sincronizar con total_amount
    IF NEW.total IS NOT NULL AND NEW.total != OLD.total THEN
        NEW.total_amount = NEW.total;
    END IF;
    
    -- Si se actualiza total_amount, sincronizar con total
    IF NEW.total_amount IS NOT NULL AND NEW.total_amount != OLD.total_amount THEN
        NEW.total = NEW.total_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_order_totals_trigger') THEN
        CREATE TRIGGER sync_order_totals_trigger
            BEFORE UPDATE ON public.orders
            FOR EACH ROW
            EXECUTE FUNCTION sync_order_totals();
        RAISE NOTICE '✅ Trigger sync_order_totals_trigger creado';
    ELSE
        RAISE NOTICE '✅ Trigger sync_order_totals_trigger ya existe';
    END IF;
END $$;

-- =====================================================
-- 4. ACTUALIZAR DATOS EXISTENTES SI HAY NULOS
-- =====================================================

-- Sincronizar total_amount con total para órdenes existentes
UPDATE public.orders 
SET total_amount = COALESCE(total, 0)
WHERE total_amount IS NULL OR total_amount = 0;

-- Sincronizar total con total_amount para órdenes existentes
UPDATE public.orders 
SET total = COALESCE(total_amount, 0)
WHERE total IS NULL OR total = 0;

COMMIT;

-- =====================================================
-- 5. VERIFICACION FINAL
-- =====================================================

SELECT 
    'ORDERS' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN total_amount IS NULL THEN 1 END) as total_amount_nulos,
    COUNT(CASE WHEN total IS NULL THEN 1 END) as total_nulos
FROM public.orders

UNION ALL

SELECT 
    'ORDER_ITEMS' as tabla,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN price IS NULL THEN 1 END) as price_nulos,
    COUNT(CASE WHEN quantity IS NULL THEN 1 END) as quantity_nulos
FROM public.order_items;

RAISE NOTICE '🎉 Script ejecutado exitosamente. Revisa el resultado de la consulta arriba.';
