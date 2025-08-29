-- ==========================================
-- AGREGAR COLUMNA is_available A PRODUCTS
-- ==========================================

DO $$
BEGIN
    -- Verificar si la columna is_available ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'is_available'
    ) THEN
        -- Agregar la columna is_available
        ALTER TABLE public.products 
        ADD COLUMN is_available BOOLEAN DEFAULT true NOT NULL;
        
        RAISE NOTICE '✅ Columna is_available agregada a la tabla products';
    ELSE
        RAISE NOTICE '⚠️ La columna is_available ya existe en la tabla products';
    END IF;
    
    -- Actualizar todos los productos existentes
    -- Si tienen stock > 0, marcarlos como disponibles
    -- Si tienen stock = 0, marcarlos como no disponibles
    UPDATE public.products 
    SET is_available = CASE 
        WHEN stock_quantity > 0 THEN true 
        ELSE false 
    END
    WHERE is_available IS NULL OR is_available = false;
    
    RAISE NOTICE '✅ Productos actualizados según su stock_quantity';
    
    -- Mostrar estadísticas
    DECLARE
        total_products INTEGER;
        available_products INTEGER;
        unavailable_products INTEGER;
        zero_stock INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_products FROM public.products;
        SELECT COUNT(*) INTO available_products FROM public.products WHERE is_available = true;
        SELECT COUNT(*) INTO unavailable_products FROM public.products WHERE is_available = false;
        SELECT COUNT(*) INTO zero_stock FROM public.products WHERE stock_quantity = 0;
        
        RAISE NOTICE '📊 ESTADÍSTICAS:';
        RAISE NOTICE '   Total productos: %', total_products;
        RAISE NOTICE '   Disponibles: %', available_products;
        RAISE NOTICE '   No disponibles: %', unavailable_products;
        RAISE NOTICE '   Sin stock: %', zero_stock;
    END;
    
END $$;

-- Crear índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_products_is_available 
ON public.products(is_available) 
WHERE is_available = true;

-- Crear índice compuesto para consultas de productos disponibles con stock
CREATE INDEX IF NOT EXISTS idx_products_available_stock 
ON public.products(is_available, stock_quantity) 
WHERE is_available = true AND stock_quantity > 0;

RAISE NOTICE '✅ Índices creados para optimizar consultas de disponibilidad';
