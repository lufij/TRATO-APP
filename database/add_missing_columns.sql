-- =====================================================
-- TRATO - VERIFICAR Y AGREGAR COLUMNAS FALTANTES
-- =====================================================

-- Agregar columna payment_method si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer'));
        RAISE NOTICE 'Columna payment_method agregada a la tabla orders';
    ELSE
        RAISE NOTICE 'Columna payment_method ya existe en la tabla orders';
    END IF;
END $$;

-- Agregar columna price_per_unit si no existe en order_items
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        ALTER TABLE public.order_items ADD COLUMN price_per_unit DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Columna price_per_unit agregada a la tabla order_items';
    ELSE
        RAISE NOTICE 'Columna price_per_unit ya existe en la tabla order_items';
    END IF;
END $$;

-- Agregar columna total_price si no existe en order_items
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Columna total_price agregada a la tabla order_items';
    ELSE
        RAISE NOTICE 'Columna total_price ya existe en la tabla order_items';
    END IF;
END $$;

-- Actualizar price_per_unit usando la columna price existente
UPDATE public.order_items 
SET price_per_unit = price 
WHERE price_per_unit = 0 AND price IS NOT NULL;

-- Actualizar total_price calculándolo
UPDATE public.order_items 
SET total_price = price_per_unit * quantity 
WHERE total_price = 0;

SELECT 'Columnas verificadas y actualizadas exitosamente' as status;
