-- ========================================================
-- CORRECCIÓN INMEDIATA: Error "null value in column 'total_amount'"
-- Ejecutar en Supabase SQL Editor para solucionar problemas de checkout
-- ========================================================

BEGIN;

-- =====================================================
-- 1. VERIFICAR Y CORREGIR TABLA ORDERS
-- =====================================================

-- Agregar total_amount si no existe (campo principal requerido)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount') THEN
        ALTER TABLE public.orders ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ Columna total_amount agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna total_amount ya existe en orders';
    END IF;
END $$;

-- Agregar subtotal si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal') THEN
        ALTER TABLE public.orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna subtotal agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna subtotal ya existe en orders';
    END IF;
END $$;

-- Agregar delivery_fee si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna delivery_fee agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna delivery_fee ya existe en orders';
    END IF;
END $$;

-- Agregar total (por compatibilidad)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total') THEN
        ALTER TABLE public.orders ADD COLUMN total DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna total agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna total ya existe en orders';
    END IF;
END $$;

-- Agregar delivery_type si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type TEXT DEFAULT 'pickup';
        RAISE NOTICE '✅ Columna delivery_type agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna delivery_type ya existe en orders';
    END IF;
END $$;

-- Agregar delivery_address si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE '✅ Columna delivery_address agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna delivery_address ya existe en orders';
    END IF;
END $$;

-- Agregar customer_notes si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_notes') THEN
        ALTER TABLE public.orders ADD COLUMN customer_notes TEXT;
        RAISE NOTICE '✅ Columna customer_notes agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna customer_notes ya existe en orders';
    END IF;
END $$;

-- Agregar phone_number si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'phone_number') THEN
        ALTER TABLE public.orders ADD COLUMN phone_number TEXT;
        RAISE NOTICE '✅ Columna phone_number agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna phone_number ya existe en orders';
    END IF;
END $$;

-- Agregar customer_name si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
        RAISE NOTICE '✅ Columna customer_name agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna customer_name ya existe en orders';
    END IF;
END $$;

-- Agregar payment_method si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
        RAISE NOTICE '✅ Columna payment_method agregada a orders';
    ELSE
        RAISE NOTICE '✅ Columna payment_method ya existe en orders';
    END IF;
END $$;

-- =====================================================
-- 2. VERIFICAR Y CORREGIR TABLA ORDER_ITEMS
-- =====================================================

-- Agregar price si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price') THEN
        ALTER TABLE public.order_items ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna price agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna price ya existe en order_items';
    END IF;
END $$;

-- Agregar price_per_unit si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        ALTER TABLE public.order_items ADD COLUMN price_per_unit DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna price_per_unit agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna price_per_unit ya existe en order_items';
    END IF;
END $$;

-- Agregar total_price si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna total_price agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna total_price ya existe en order_items';
    END IF;
END $$;

-- Agregar product_name si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_name') THEN
        ALTER TABLE public.order_items ADD COLUMN product_name TEXT;
        RAISE NOTICE '✅ Columna product_name agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna product_name ya existe en order_items';
    END IF;
END $$;

-- Agregar product_image si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_image') THEN
        ALTER TABLE public.order_items ADD COLUMN product_image TEXT;
        RAISE NOTICE '✅ Columna product_image agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna product_image ya existe en order_items';
    END IF;
END $$;

-- Agregar quantity si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'quantity') THEN
        ALTER TABLE public.order_items ADD COLUMN quantity INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Columna quantity agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna quantity ya existe en order_items';
    END IF;
END $$;

-- Agregar notes si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'notes') THEN
        ALTER TABLE public.order_items ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Columna notes agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna notes ya existe en order_items';
    END IF;
END $$;

-- =====================================================
-- 3. SINCRONIZAR DATOS EXISTENTES
-- =====================================================

-- Sincronizar total_amount con total en órdenes existentes
UPDATE public.orders 
SET total_amount = COALESCE(total, 0) 
WHERE total_amount IS NULL OR total_amount = 0;

-- Sincronizar total con total_amount en órdenes existentes
UPDATE public.orders 
SET total = COALESCE(total_amount, 0) 
WHERE total IS NULL OR total = 0;

-- Calcular totales faltantes basado en items
UPDATE public.orders 
SET 
    total_amount = COALESCE((
        SELECT SUM(COALESCE(price, 0) * COALESCE(quantity, 1))
        FROM order_items 
        WHERE order_id = orders.id
    ), 0) + COALESCE(delivery_fee, 0),
    total = COALESCE((
        SELECT SUM(COALESCE(price, 0) * COALESCE(quantity, 1))
        FROM order_items 
        WHERE order_id = orders.id
    ), 0) + COALESCE(delivery_fee, 0)
WHERE (total_amount IS NULL OR total_amount = 0) AND id IN (
    SELECT DISTINCT order_id FROM order_items WHERE order_id IS NOT NULL
);

-- =====================================================
-- 4. VERIFICACIÓN FINAL
-- =====================================================

COMMIT;

-- Mostrar resultados
SELECT 
    '✅ CORRECCIÓN COMPLETADA' as resultado,
    'Tabla orders preparada para checkout' as descripcion;

-- Verificar estructura de orders
SELECT 
    'orders' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
AND column_name IN ('total_amount', 'subtotal', 'delivery_fee', 'total', 'delivery_type', 'customer_name', 'phone_number', 'payment_method')
ORDER BY column_name;

-- Verificar estructura de order_items
SELECT 
    'order_items' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'order_items'
AND column_name IN ('price', 'price_per_unit', 'total_price', 'product_name', 'quantity', 'notes')
ORDER BY column_name;

-- Contar órdenes existentes
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN total_amount > 0 THEN 1 END) as orders_with_total,
    COUNT(CASE WHEN total_amount IS NULL OR total_amount = 0 THEN 1 END) as orders_without_total
FROM orders;

SELECT '🚀 CHECKOUT LISTO PARA USAR - Problema del total_amount solucionado' as mensaje_final;
