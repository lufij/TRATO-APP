-- =====================================================
-- TRATO - CORRECCIÓN SIMPLE PARA DAILY_PRODUCTS
-- =====================================================
-- Este script corrige la tabla daily_products paso a paso

BEGIN;

-- =====================================================
-- 1. VERIFICAR Y AGREGAR COLUMNAS FALTANTES
-- =====================================================

DO $$
BEGIN
    -- Agregar expires_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'expires_at') THEN
        ALTER TABLE public.daily_products ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day');
        RAISE NOTICE 'Columna expires_at agregada a daily_products';
    END IF;

    -- Agregar seller_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'seller_id') THEN
        ALTER TABLE public.daily_products ADD COLUMN seller_id UUID;
        RAISE NOTICE 'Columna seller_id agregada a daily_products';
    END IF;

    -- Agregar image_url si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'image_url') THEN
        ALTER TABLE public.daily_products ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Columna image_url agregada a daily_products';
    END IF;

    -- Agregar category si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'category') THEN
        ALTER TABLE public.daily_products ADD COLUMN category TEXT;
        RAISE NOTICE 'Columna category agregada a daily_products';
    END IF;

    -- Agregar is_available si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'is_available') THEN
        ALTER TABLE public.daily_products ADD COLUMN is_available BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna is_available agregada a daily_products';
    END IF;

    -- Agregar stock_quantity si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE public.daily_products ADD COLUMN stock_quantity INTEGER DEFAULT 10;
        RAISE NOTICE 'Columna stock_quantity agregada a daily_products';
    END IF;
END $$;

-- =====================================================
-- 2. ACTUALIZAR REGISTROS EXISTENTES
-- =====================================================

DO $$
DECLARE
    demo_seller_id UUID;
BEGIN
    -- Obtener un seller_id válido
    SELECT id INTO demo_seller_id FROM public.users LIMIT 1;
    
    IF demo_seller_id IS NULL THEN
        demo_seller_id := uuid_generate_v4();
        RAISE NOTICE 'Usando seller_id temporal: %', demo_seller_id;
    END IF;

    -- Actualizar registros existentes que no tienen seller_id
    UPDATE public.daily_products 
    SET 
        seller_id = demo_seller_id,
        expires_at = COALESCE(expires_at, NOW() + INTERVAL '1 day'),
        is_available = COALESCE(is_available, true),
        stock_quantity = COALESCE(stock_quantity, 10)
    WHERE seller_id IS NULL OR expires_at IS NULL;

    RAISE NOTICE 'Registros existentes actualizados';
END $$;

-- =====================================================
-- 3. LIMPIAR PRODUCTOS DUPLICADOS EN TABLA INCORRECTA
-- =====================================================

-- Eliminar productos que están en 'products' pero deberían estar en 'daily_products'
DELETE FROM public.products 
WHERE name IN ('Calcomanías para carros', 'Kit limpieza interior', 'Calcomanías para moto');

-- =====================================================
-- 4. INSERTAR PRODUCTOS NUEVOS SI NO EXISTEN
-- =====================================================

DO $$
DECLARE
    demo_seller_id UUID;
BEGIN
    -- Obtener seller_id
    SELECT id INTO demo_seller_id FROM public.users LIMIT 1;
    
    IF demo_seller_id IS NULL THEN
        demo_seller_id := uuid_generate_v4();
    END IF;

    -- Insertar Calcomanías para carros si no existe
    IF NOT EXISTS (SELECT 1 FROM public.daily_products WHERE name = 'Calcomanías para carros') THEN
        INSERT INTO public.daily_products (name, price, description, image_url, category, is_available, stock_quantity, expires_at, seller_id)
        VALUES (
            'Calcomanías para carros',
            450.00,
            'Franjas decorativas',
            'https://trato-app.vercel.app/images/calcomania.jpg',
            'Accesorios',
            true,
            10,
            NOW() + INTERVAL '1 day',
            demo_seller_id
        );
        RAISE NOTICE 'Producto "Calcomanías para carros" insertado';
    END IF;

    -- Insertar Kit limpieza interior si no existe
    IF NOT EXISTS (SELECT 1 FROM public.daily_products WHERE name = 'Kit limpieza interior') THEN
        INSERT INTO public.daily_products (name, price, description, image_url, category, is_available, stock_quantity, expires_at, seller_id)
        VALUES (
            'Kit limpieza interior',
            120.00,
            'Kit completo para limpieza de autos',
            'https://trato-app.vercel.app/images/kit_limpieza.jpg',
            'Limpieza',
            true,
            15,
            NOW() + INTERVAL '1 day',
            demo_seller_id
        );
        RAISE NOTICE 'Producto "Kit limpieza interior" insertado';
    END IF;

    -- Actualizar Calcomanías para moto si existe pero le faltan campos
    UPDATE public.daily_products 
    SET 
        image_url = COALESCE(image_url, 'https://deadlytelokolahufed.supabase.co/storage/v1/object/public/products/5f471a67-a66e-4166-9370-303866cf9966'),
        category = COALESCE(category, 'Otros'),
        is_available = COALESCE(is_available, true),
        stock_quantity = COALESCE(stock_quantity, 4),
        expires_at = COALESCE(expires_at, NOW() + INTERVAL '1 day'),
        seller_id = COALESCE(seller_id, demo_seller_id)
    WHERE name = 'Calcomanías para moto';

    RAISE NOTICE 'Productos verificados y actualizados';
END $$;

COMMIT;

-- =====================================================
-- 5. VERIFICAR RESULTADOS
-- =====================================================

SELECT 
    'daily_products' as tabla,
    COUNT(*) as total_productos,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as productos_vigentes,
    COUNT(CASE WHEN seller_id IS NOT NULL THEN 1 END) as productos_con_vendedor
FROM public.daily_products;

SELECT 'Corrección de daily_products completada exitosamente' as status;
