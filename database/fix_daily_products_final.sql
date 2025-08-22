-- =====================================================
-- TRATO - CORRECCIÓN ESPECÍFICA PARA DAILY_PRODUCTS
-- =====================================================
-- Este script corrige específicamente los productos en daily_products

BEGIN;

-- =====================================================
-- 1. AGREGAR SELLER_ID A DAILY_PRODUCTS SI NO EXISTE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'seller_id') THEN
        ALTER TABLE public.daily_products ADD COLUMN seller_id UUID;
        RAISE NOTICE 'Columna seller_id agregada a daily_products';
    END IF;
END $$;

-- =====================================================
-- 2. LIMPIAR PRODUCTOS DUPLICADOS EN TABLA INCORRECTA
-- =====================================================

-- Eliminar productos que están en 'products' pero deberían estar en 'daily_products'
DELETE FROM public.products 
WHERE name IN ('Calcomanías para carros', 'Kit limpieza interior', 'Calcomanías para moto');

-- =====================================================
-- 3. INSERTAR PRODUCTOS CORRECTAMENTE EN DAILY_PRODUCTS
-- =====================================================

DO $$
DECLARE
    demo_seller_id UUID;
BEGIN
    -- Obtener un seller_id válido (primer usuario o generar uno temporal)
    SELECT id INTO demo_seller_id FROM public.users LIMIT 1;
    
    IF demo_seller_id IS NULL THEN
        demo_seller_id := uuid_generate_v4();
        RAISE NOTICE 'Usando seller_id temporal: %', demo_seller_id;
    ELSE
        RAISE NOTICE 'Usando seller_id existente: %', demo_seller_id;
    END IF;

    -- Actualizar productos existentes sin seller_id
    UPDATE public.daily_products 
    SET seller_id = demo_seller_id 
    WHERE seller_id IS NULL;

    -- Insertar productos nuevos si no existen
    INSERT INTO public.daily_products (name, price, description, image_url, category, is_available, stock_quantity, expires_at, seller_id)
    SELECT 
        'Calcomanías para carros',
        450.00,
        'Franjas decorativas',
        'https://trato-app.vercel.app/images/calcomania.jpg',
        'Accesorios',
        true,
        10,
        NOW() + INTERVAL '1 day',
        demo_seller_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.daily_products WHERE name = 'Calcomanías para carros'
    );

    INSERT INTO public.daily_products (name, price, description, image_url, category, is_available, stock_quantity, expires_at, seller_id)
    SELECT 
        'Kit limpieza interior',
        120.00,
        'Kit completo para limpieza de autos',
        'https://trato-app.vercel.app/images/kit_limpieza.jpg',
        'Limpieza',
        true,
        15,
        NOW() + INTERVAL '1 day',
        demo_seller_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.daily_products WHERE name = 'Kit limpieza interior'
    );

    -- Insertar producto adicional
    INSERT INTO public.daily_products (name, price, description, image_url, category, is_available, stock_quantity, expires_at, seller_id)
    SELECT 
        'Calcomanías para moto',
        250.00,
        'Franjas para moto',
        'https://deadlytelokolahufed.supabase.co/storage/v1/object/public/products/5f471a67-a66e-4166-9370-303866cf9966',
        'Otros',
        true,
        4,
        NOW() + INTERVAL '1 day',
        demo_seller_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.daily_products WHERE name = 'Calcomanías para moto'
    );

    RAISE NOTICE 'Productos verificados/insertados en daily_products';
END $$;

-- =====================================================
-- 4. VERIFICAR RESULTADOS
-- =====================================================

-- Mostrar productos en daily_products
SELECT 
    'daily_products' as tabla,
    id,
    name,
    price,
    category,
    is_available,
    stock_quantity,
    seller_id,
    expires_at
FROM public.daily_products
ORDER BY created_at DESC;

COMMIT;

SELECT 'Corrección de daily_products completada' as status;
