-- =====================================================
-- 🚨 FIX URGENTE: ERROR DE CHECKOUT DELIVERY_ADDRESS
-- =====================================================
-- Ejecutar inmediatamente en Supabase SQL Editor

-- 🔍 PASO 1: Verificar estructura actual de la tabla orders
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'delivery_address'
ORDER BY ordinal_position;

-- 🔧 PASO 2: Hacer delivery_address opcional (permitir NULL)
DO $$
BEGIN
    -- Verificar si la columna delivery_address existe y es NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'delivery_address' 
        AND is_nullable = 'NO'
    ) THEN
        -- Cambiar la columna para permitir NULL
        ALTER TABLE public.orders ALTER COLUMN delivery_address DROP NOT NULL;
        RAISE NOTICE '✅ Columna delivery_address ahora permite NULL';
    ELSE
        RAISE NOTICE '✅ Columna delivery_address ya permite NULL o no existe';
    END IF;
    
    -- Asegurar que la columna existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_address'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE '✅ Columna delivery_address agregada';
    END IF;
END $$;

-- 🔧 PASO 3: Verificar y corregir constraint si existe
DO $$
BEGIN
    -- Eliminar constraint NOT NULL si existe
    BEGIN
        ALTER TABLE public.orders ALTER COLUMN delivery_address DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ℹ️ Constraint NOT NULL ya removido o no existía';
    END;
END $$;

-- 🔧 PASO 4: Verificar estructura de order_items también
DO $$
BEGIN
    -- Asegurar que order_items tiene las columnas necesarias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_name') THEN
        ALTER TABLE public.order_items ADD COLUMN product_name TEXT;
        RAISE NOTICE '✅ Columna product_name agregada a order_items';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price') THEN
        ALTER TABLE public.order_items ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna price agregada a order_items';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') THEN
        ALTER TABLE public.order_items ADD COLUMN quantity INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Columna quantity agregada a order_items';
    END IF;
END $$;

-- 🔧 PASO 5: Verificar que el trigger de stock esté funcionando
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_order_confirm';

-- 🔍 PASO 6: Verificación final - mostrar estructura actualizada
SELECT 'VERIFICACIÓN FINAL:' as status;

SELECT 
    column_name as "Columna",
    data_type as "Tipo",
    is_nullable as "Permite NULL",
    COALESCE(column_default, 'Sin default') as "Valor por defecto"
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('delivery_address', 'delivery_type', 'customer_name', 'phone_number')
ORDER BY column_name;

-- ✅ Mensaje final
SELECT '✅ TABLA ORDERS CORREGIDA - CHECKOUT DEBERÍA FUNCIONAR AHORA' as resultado;
