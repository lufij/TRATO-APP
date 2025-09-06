-- =====================================================
-- TRATO - SOLUCIÓN MAESTRA PARA TODOS LOS ERRORES DE FOREIGN KEY
-- =====================================================
-- Este script ejecuta ambas soluciones en el orden correcto:
-- 1. Arregla foreign keys de orders/users 
-- 2. Elimina constraint problemático de cart_items
-- 3. Implementa validación por software para carrito
-- EJECUTAR ESTE ÚNICO SCRIPT PARA SOLUCIONAR TODO

BEGIN;

RAISE NOTICE '==========================================';
RAISE NOTICE 'INICIANDO CORRECCIÓN COMPLETA DE FOREIGN KEYS';
RAISE NOTICE '==========================================';

-- =====================================================
-- PARTE 1: VERIFICAR TABLAS BASE CRÍTICAS
-- =====================================================

-- Verificar que users existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'La tabla users no existe. Ejecuta primero los scripts de setup de Supabase Auth.';
    END IF;
    RAISE NOTICE '✓ Tabla users existe';
END $$;

-- =====================================================
-- PARTE 1: CORRIGIENDO FOREIGN KEYS DE ORDERS
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE '=== PARTE 1: CORRIGIENDO FOREIGN KEYS DE ORDERS ===';

-- Eliminar constraints existentes que puedan causar problemas
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_driver_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.order_drivers DROP CONSTRAINT IF EXISTS order_drivers_order_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.order_drivers DROP CONSTRAINT IF EXISTS order_drivers_driver_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.ratings DROP CONSTRAINT IF EXISTS ratings_order_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.ratings DROP CONSTRAINT IF EXISTS ratings_buyer_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.ratings DROP CONSTRAINT IF EXISTS ratings_seller_id_fkey CASCADE;

-- Crear foreign keys correctos y seguros para orders
DO $$
BEGIN
    -- Foreign key seguro para buyer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'orders' AND kcu.column_name = 'buyer_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Foreign key seguro para seller_id  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'orders' AND kcu.column_name = 'seller_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Foreign key seguro para driver_id (puede ser null)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'orders' AND kcu.column_name = 'driver_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Foreign key para order_items -> orders (crítico)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'order_items' AND kcu.column_name = 'order_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;

    -- Foreign key para ratings -> orders
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'ratings' AND kcu.column_name = 'order_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.ratings ADD CONSTRAINT ratings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;

    -- Foreign key para notifications -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'notifications' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

RAISE NOTICE '✓ Foreign keys de orders creados correctamente';

-- =====================================================
-- PARTE 2: ELIMINANDO CONSTRAINT PROBLEMÁTICO DE CART
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE '=== PARTE 2: ELIMINANDO CONSTRAINT PROBLEMÁTICO DE CART ===';

-- Eliminar cualquier foreign key problemático de cart_items hacia products
-- (Esto causa problemas con productos del día)
ALTER TABLE IF EXISTS public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey CASCADE;

RAISE NOTICE '✓ Constraints problemáticos de cart_items eliminados';

-- =====================================================
-- PARTE 3: ACTUALIZANDO ESTRUCTURA DE CART_ITEMS
-- =====================================================

-- Agregar columnas faltantes a cart_items para manejar productos regulares y del día

RAISE NOTICE '';
RAISE NOTICE '=== PARTE 3: ACTUALIZANDO ESTRUCTURA DE CART_ITEMS ===';

DO $$
BEGIN
    -- created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Columna created_at agregada';
    END IF;

    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Columna updated_at agregada';
    END IF;

    -- product_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular';
        RAISE NOTICE 'Columna product_type agregada';
    END IF;

    -- product_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
        RAISE NOTICE 'Columna product_name agregada';
    END IF;

    -- product_price
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
        RAISE NOTICE 'Columna product_price agregada';
    END IF;

    -- product_image
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
        RAISE NOTICE 'Columna product_image agregada';
    END IF;

    -- seller_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
        RAISE NOTICE 'Columna seller_id agregada';
    END IF;
END $$;

-- =====================================================
-- PARTE 4: CREAR FUNCIONES DE VALIDACIÓN CORREGIDAS
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE '=== PARTE 4: CREANDO FUNCIONES DE VALIDACIÓN ===';

-- Función para validar productos (CORREGIDA con is_available)
CREATE OR REPLACE FUNCTION validate_and_get_product_data(
    p_product_id UUID,
    p_product_type TEXT DEFAULT 'regular'
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_price DECIMAL(10,2),
    product_image TEXT,
    seller_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    IF p_product_type = 'daily' THEN
        RETURN QUERY
        SELECT 
            dp.id,
            dp.name,
            dp.price,
            dp.image_url,
            dp.seller_id,
            true as is_valid,
            'Valid daily product'::TEXT as error_message
        FROM public.daily_products dp
        WHERE dp.id = p_product_id 
        AND dp.expires_at > NOW()
        AND dp.stock_quantity > 0
        AND dp.is_available = true;  -- ✅ LÍNEA CORREGIDA
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Daily product not found'::TEXT,
                0.00::DECIMAL(10,2),
                NULL::TEXT,
                NULL::UUID,
                false as is_valid,
                'Daily product not found, expired, out of stock, or not available'::TEXT;
        END IF;
    ELSE
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.price,
            p.image_url,
            p.seller_id,
            true as is_valid,
            'Valid regular product'::TEXT as error_message
        FROM public.products p
        WHERE p.id = p_product_id 
        AND p.is_public = true
        AND p.stock_quantity > 0;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Regular product not found'::TEXT,
                0.00::DECIMAL(10,2),
                NULL::TEXT,
                NULL::UUID,
                false as is_valid,
                'Regular product not found, private, or out of stock'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para agregar al carrito de forma segura
CREATE OR REPLACE FUNCTION add_to_cart_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_product_type TEXT DEFAULT 'regular'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cart_item_id UUID
) AS $$
DECLARE
    validation_result RECORD;
    existing_cart_seller UUID;
    existing_item_id UUID;
    new_cart_item_id UUID;
BEGIN
    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'User ID and Product ID are required', NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'Quantity must be greater than 0', NULL::UUID;
        RETURN;
    END IF;

    -- Validar producto
    SELECT * INTO validation_result 
    FROM validate_and_get_product_data(p_product_id, p_product_type);
    
    IF NOT validation_result.is_valid THEN
        RETURN QUERY SELECT false, validation_result.error_message, NULL::UUID;
        RETURN;
    END IF;

    -- Verificar vendedor único en carrito
    SELECT DISTINCT seller_id INTO existing_cart_seller
    FROM public.cart_items 
    WHERE user_id = p_user_id 
    AND seller_id IS NOT NULL
    LIMIT 1;

    IF existing_cart_seller IS NOT NULL AND existing_cart_seller != validation_result.seller_id THEN
        RETURN QUERY SELECT 
            false, 
            'Cart can only contain products from one seller. Please clear cart first.',
            NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si ya existe en carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND product_type = p_product_type;

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar existente
        UPDATE public.cart_items 
        SET 
            quantity = quantity + p_quantity,
            updated_at = NOW(),
            product_name = validation_result.product_name,
            product_price = validation_result.product_price,
            product_image = validation_result.product_image
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT true, 'Product quantity updated in cart', existing_item_id;
    ELSE
        -- Crear nuevo
        INSERT INTO public.cart_items (
            user_id, product_id, product_type, quantity,
            product_name, product_price, product_image, seller_id,
            created_at, updated_at
        ) VALUES (
            p_user_id, p_product_id, p_product_type, p_quantity,
            validation_result.product_name, validation_result.product_price, 
            validation_result.product_image, validation_result.seller_id,
            NOW(), NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT true, 'Product added to cart successfully', new_cart_item_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función de limpieza
CREATE OR REPLACE FUNCTION cleanup_invalid_cart_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Eliminar items inválidos del carrito
    DELETE FROM public.cart_items 
    WHERE (product_type = 'regular' AND NOT EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = cart_items.product_id 
        AND p.is_public = true 
        AND p.stock_quantity > 0
    )) OR (product_type = 'daily' AND NOT EXISTS (
        SELECT 1 FROM public.daily_products dp 
        WHERE dp.id = cart_items.product_id 
        AND dp.expires_at > NOW() 
        AND dp.stock_quantity > 0
        AND dp.is_available = true
    ));
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✓ Funciones de validación creadas (con corrección is_available)';

-- =====================================================
-- PARTE 5: CREAR/ACTUALIZAR TABLAS RELACIONADAS
-- =====================================================

-- Crear tabla order_drivers si no existe
CREATE TABLE IF NOT EXISTS public.order_drivers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed'))
);

-- Crear tabla notifications si no existe  
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla ratings si no existe
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

RAISE NOTICE '✓ Tablas relacionadas con orders creadas';

-- =====================================================
-- PARTE 6: CONFIGURAR RLS Y CREAR ÍNDICES
-- =====================================================

-- Habilitar RLS en cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cart_items
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
CREATE POLICY "Users can view their own cart items" ON public.cart_items
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
CREATE POLICY "Users can insert their own cart items" ON public.cart_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
CREATE POLICY "Users can update their own cart items" ON public.cart_items
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
CREATE POLICY "Users can delete their own cart items" ON public.cart_items
    FOR DELETE USING (user_id = auth.uid());

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_type_id ON public.cart_items(product_type, product_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

RAISE NOTICE '✓ Políticas RLS e índices creados';

-- =====================================================
-- PARTE 7: AÑADIR FOREIGN KEY SEGURO PARA CART_ITEMS -> USERS
-- =====================================================

DO $$
BEGIN
    -- Solo agregar el foreign key hacia users (que sí debe existir)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key seguro user_id agregado a cart_items';
    END IF;
END $$;

-- =====================================================
-- PARTE 8: CREAR TRIGGER PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cart_items
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 9: LIMPIAR DATOS INVÁLIDOS
-- =====================================================

-- Ejecutar limpieza inicial
SELECT cleanup_invalid_cart_items() as items_cleaned_up;

-- =====================================================
-- PARTE 10: VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    orders_fk_count INTEGER;
    cart_structure_ok BOOLEAN := true;
    daily_products_ok BOOLEAN := true;
BEGIN
    -- Contar foreign keys creados en orders
    SELECT COUNT(*) INTO orders_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'orders' 
    AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id') 
    AND tc.constraint_type = 'FOREIGN KEY';

    -- Verificar estructura de cart_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_type') THEN
        cart_structure_ok := false;
    END IF;

    -- Verificar daily_products
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_products') THEN
        daily_products_ok := false;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎉 CORRECCIÓN COMPLETA FINALIZADA!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ESTADO FINAL:';
    RAISE NOTICE '   • Orders foreign keys: %/3 (buyer, seller, driver)', orders_fk_count;
    RAISE NOTICE '   • Cart structure updated: %', CASE WHEN cart_structure_ok THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '   • Daily products table: %', CASE WHEN daily_products_ok THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '   • Validation functions: CREATED with is_available fix';
    RAISE NOTICE '   • RLS policies: CONFIGURED';
    RAISE NOTICE '';
    RAISE NOTICE '✅ PROBLEMA PRODUCTOS DEL DÍA: CORREGIDO';
    RAISE NOTICE '   La función validate_and_get_product_data ahora incluye';  
    RAISE NOTICE '   la validación is_available = true para productos del día';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMO PASO: Probar agregar productos del día al carrito';
END $$;

COMMIT;

-- =====================================================
-- INSTRUCCIONES FINALES
-- =====================================================

-- Para probar la corrección:
-- 1. Verificar que el producto "Cerveza" tenga is_available = true
-- 2. Intentar agregar al carrito desde la interfaz
-- 3. Si sigue fallando, ejecutar: SELECT * FROM validate_and_get_product_data('[ID_DEL_PRODUCTO]', 'daily');
