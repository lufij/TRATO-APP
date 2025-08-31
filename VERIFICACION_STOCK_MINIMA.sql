-- =====================================================
-- 🔧 VERIFICACIÓN Y CONFIGURACIÓN MÍNIMA PARA STOCK
-- =====================================================
-- Ejecutar estos SQL en Supabase SQL Editor si hay problemas

-- ✅ PASO 1: Verificar que daily_products tiene las columnas necesarias
DO $$
BEGIN
    -- Agregar stock_quantity si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_products' 
        AND column_name = 'stock_quantity'
    ) THEN
        ALTER TABLE public.daily_products ADD COLUMN stock_quantity INTEGER DEFAULT 10;
        RAISE NOTICE '✅ Columna stock_quantity agregada a daily_products';
    ELSE
        RAISE NOTICE 'ℹ️ Columna stock_quantity ya existe en daily_products';
    END IF;

    -- Agregar seller_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_products' 
        AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.daily_products ADD COLUMN seller_id UUID;
        RAISE NOTICE '✅ Columna seller_id agregada a daily_products';
    ELSE
        RAISE NOTICE 'ℹ️ Columna seller_id ya existe en daily_products';
    END IF;
END $$;

-- ✅ PASO 2: Verificar que order_items tiene las columnas necesarias
DO $$
BEGIN
    -- Agregar daily_product_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items' 
        AND column_name = 'daily_product_id'
    ) THEN
        ALTER TABLE public.order_items ADD COLUMN daily_product_id UUID;
        RAISE NOTICE '✅ Columna daily_product_id agregada a order_items';
    ELSE
        RAISE NOTICE 'ℹ️ Columna daily_product_id ya existe en order_items';
    END IF;

    -- Agregar product_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items' 
        AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.order_items ADD COLUMN product_type TEXT DEFAULT 'regular';
        RAISE NOTICE '✅ Columna product_type agregada a order_items';
    ELSE
        RAISE NOTICE 'ℹ️ Columna product_type ya existe en order_items';
    END IF;
END $$;

-- ✅ PASO 3: Asegurar que hay productos del día con stock > 0
DO $$
DECLARE
    demo_seller_id UUID;
    products_count INTEGER;
BEGIN
    -- Contar productos del día disponibles
    SELECT COUNT(*) INTO products_count
    FROM public.daily_products 
    WHERE stock_quantity > 0 
    AND expires_at > NOW();

    RAISE NOTICE 'ℹ️ Productos del día disponibles: %', products_count;

    -- Si no hay productos del día, crear algunos de ejemplo
    IF products_count = 0 THEN
        RAISE NOTICE '⚠️ No hay productos del día disponibles';
        
        -- Obtener un seller_id válido
        SELECT id INTO demo_seller_id FROM public.users WHERE role = 'vendedor' LIMIT 1;
        
        IF demo_seller_id IS NULL THEN
            SELECT id INTO demo_seller_id FROM public.users LIMIT 1;
        END IF;

        IF demo_seller_id IS NOT NULL THEN
            -- Insertar productos de ejemplo
            INSERT INTO public.daily_products (
                name, price, description, category, 
                is_available, stock_quantity, expires_at, seller_id
            ) VALUES 
            (
                'Tostadas de Prueba',
                15.00,
                'Producto de prueba para testing',
                'Alimentos',
                true,
                10,
                NOW() + INTERVAL '1 day',
                demo_seller_id
            ),
            (
                'Rellenitos de Prueba',
                12.00,
                'Producto de prueba para testing',
                'Alimentos',
                true,
                8,
                NOW() + INTERVAL '1 day',
                demo_seller_id
            )
            ON CONFLICT (name) DO NOTHING;
            
            RAISE NOTICE '✅ Productos de prueba creados';
        ELSE
            RAISE NOTICE '⚠️ No hay usuarios para asignar como sellers';
        END IF;
    END IF;
END $$;

-- ✅ PASO 4: Verificar permisos de las tablas
DO $$
BEGIN
    -- Verificar que authenticated users pueden leer/escribir
    GRANT SELECT, INSERT, UPDATE ON public.daily_products TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
    
    RAISE NOTICE '✅ Permisos verificados para authenticated users';
END $$;

-- ✅ PASO 5: Mostrar estado actual
SELECT 
    '=== RESUMEN DE CONFIGURACIÓN ===' as info;

SELECT 
    'DAILY PRODUCTS DISPONIBLES:' as categoria,
    COUNT(*) as cantidad
FROM public.daily_products 
WHERE stock_quantity > 0 AND expires_at > NOW();

SELECT 
    'ÓRDENES RECIENTES CON PRODUCTOS DEL DÍA:' as categoria,
    COUNT(*) as cantidad
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
WHERE oi.product_type = 'daily'
AND o.created_at >= CURRENT_DATE;

SELECT 
    '✅ CONFIGURACIÓN COMPLETADA' as resultado,
    'Frontend manejará el stock automáticamente' as metodo,
    'No se requieren triggers de DB adicionales' as nota;
