-- 🔥 SOLUCION DEFINITIVA PARA TODOS LOS ERRORES DE ORDER_ITEMS
-- Ejecuta este script para resolver TODOS los errores de columnas faltantes

BEGIN;

-- =====================================================
-- 1. VERIFICAR Y AGREGAR TODAS LAS COLUMNAS FALTANTES EN ORDER_ITEMS
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '🔧 Verificando y corrigiendo tabla order_items...';
    
    -- unit_price (el error actual)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'unit_price') THEN
        ALTER TABLE public.order_items ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna unit_price agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna unit_price ya existe en order_items';
    END IF;

    -- price (precio unitario alternativo)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price') THEN
        ALTER TABLE public.order_items ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna price agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna price ya existe en order_items';
    END IF;

    -- price_per_unit (por si acaso se necesita)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        ALTER TABLE public.order_items ADD COLUMN price_per_unit DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna price_per_unit agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna price_per_unit ya existe en order_items';
    END IF;

    -- subtotal (total por item)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'subtotal') THEN
        ALTER TABLE public.order_items ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna subtotal agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna subtotal ya existe en order_items';
    END IF;

    -- total_price (precio total por item)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna total_price agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna total_price ya existe en order_items';
    END IF;

    -- quantity (cantidad)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'quantity') THEN
        ALTER TABLE public.order_items ADD COLUMN quantity INTEGER DEFAULT 1 CHECK (quantity > 0);
        RAISE NOTICE '✅ Columna quantity agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna quantity ya existe en order_items';
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

    -- order_id (por si no existe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'order_id') THEN
        ALTER TABLE public.order_items ADD COLUMN order_id UUID;
        RAISE NOTICE '✅ Columna order_id agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna order_id ya existe en order_items';
    END IF;

    -- product_id (por si no existe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_id') THEN
        ALTER TABLE public.order_items ADD COLUMN product_id UUID;
        RAISE NOTICE '✅ Columna product_id agregada a order_items';
    ELSE
        RAISE NOTICE '✅ Columna product_id ya existe en order_items';
    END IF;

    RAISE NOTICE '🎉 Todas las columnas de order_items verificadas!';
END $$;

-- =====================================================
-- 2. CREAR TRIGGER PARA SINCRONIZAR PRECIOS EN ORDER_ITEMS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_order_item_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar unit_price con price
    IF NEW.price IS NOT NULL AND (OLD.price IS NULL OR NEW.price != OLD.price) THEN
        NEW.unit_price = NEW.price;
        NEW.price_per_unit = NEW.price;
    END IF;
    
    -- Sincronizar price con unit_price
    IF NEW.unit_price IS NOT NULL AND (OLD.unit_price IS NULL OR NEW.unit_price != OLD.unit_price) THEN
        NEW.price = NEW.unit_price;
        NEW.price_per_unit = NEW.unit_price;
    END IF;
    
    -- Calcular subtotal automáticamente
    IF NEW.quantity IS NOT NULL AND NEW.unit_price IS NOT NULL THEN
        NEW.subtotal = NEW.quantity * NEW.unit_price;
        NEW.total_price = NEW.quantity * NEW.unit_price;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para order_items
DO $$
BEGIN
    -- Eliminar trigger existente si existe
    DROP TRIGGER IF EXISTS sync_order_item_prices_trigger ON public.order_items;
    
    CREATE TRIGGER sync_order_item_prices_trigger
        BEFORE INSERT OR UPDATE ON public.order_items
        FOR EACH ROW
        EXECUTE FUNCTION sync_order_item_prices();
    
    RAISE NOTICE '✅ Trigger sync_order_item_prices_trigger creado/actualizado';
END $$;

COMMIT;

-- =====================================================
-- 3. VERIFICACION FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Script ejecutado exitosamente!';
    RAISE NOTICE '📊 Verificando estructura de order_items...';
END $$;

-- Verificar que todas las columnas existan
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'order_items'
ORDER BY ordinal_position;
