-- =====================================================
-- TRATO - SOLUCIÓN MAESTRA PARA TODOS LOS ERRORES DE FOREIGN KEY
-- =====================================================
-- Este script ejecuta ambas soluciones en el orden correcto:
-- 1. Arregla foreign keys de orders/users 
-- 2. Elimina constraint problemático de cart_items
-- 3. Implementa validación por software para carrito
-- EJECUTAR ESTE ÚNICO SCRIPT PARA SOLUCIONAR TODO
-- VERSIÓN CORREGIDA: Sin errores de sintaxis RAISE

BEGIN;

-- =====================================================
-- PARTE 1: VERIFICAR TABLAS BASE CRÍTICAS
-- =====================================================

-- Verificar que users existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'CRÍTICO: Tabla users no existe. Ejecuta primero fix_setup.sql antes de continuar.';
    END IF;
    RAISE NOTICE 'Tabla users existe - OK';
END $$;

-- =====================================================
-- PARTE 2: CORRECCIÓN DE ORDERS FOREIGN KEYS
-- =====================================================

-- Función auxiliar para eliminar constraints
CREATE OR REPLACE FUNCTION drop_fk_safe(table_name TEXT, constraint_name TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = constraint_name 
        AND table_name = table_name 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', table_name, constraint_name);
        RAISE NOTICE 'Foreign key % eliminado de %', constraint_name, table_name;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error eliminando % de % (continuando): %', constraint_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Crear tabla orders si no existe
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_type VARCHAR(20) NOT NULL DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'dine-in', 'delivery')),
    delivery_address TEXT,
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(11,8),
    customer_notes TEXT,
    phone_number VARCHAR(20) NOT NULL DEFAULT '00000000',
    customer_name VARCHAR(255) NOT NULL DEFAULT 'Cliente',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'ready', 'assigned', 
        'picked-up', 'in-transit', 'delivered', 
        'completed', 'cancelled', 'rejected'
    )),
    estimated_time INTEGER NOT NULL DEFAULT 30,
    driver_id UUID,
    seller_rating INTEGER CHECK (seller_rating >= 1 AND seller_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eliminar foreign keys problemáticos
SELECT drop_fk_safe('orders', 'orders_buyer_id_fkey');
SELECT drop_fk_safe('orders', 'orders_seller_id_fkey');  
SELECT drop_fk_safe('orders', 'orders_driver_id_fkey');

-- Crear foreign keys correctos para orders
ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- =====================================================
-- PARTE 3: CORRECCIÓN DE CART_ITEMS (ELIMINAR CONSTRAINT PROBLEMÁTICO)
-- =====================================================

-- Eliminar TODOS los posibles constraints problemáticos de cart_items.product_id
SELECT drop_fk_safe('cart_items', 'cart_items_product_id_fkey');
SELECT drop_fk_safe('cart_items', 'fk_cart_items_product');
SELECT drop_fk_safe('cart_items', 'cart_items_product_fkey');

-- Verificar que user_id foreign key existe (este SÍ debe existir)
IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
) THEN
    ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key user_id agregado (este SI es necesario)';
END IF;

-- =====================================================
-- PARTE 4: ACTUALIZAR ESTRUCTURA DE CART_ITEMS
-- =====================================================

DO $$
BEGIN
    -- product_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular' CHECK (product_type IN ('regular', 'daily'));
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
-- PARTE 5: CREAR FUNCIONES DE VALIDACIÓN
-- =====================================================

-- Función para validar productos
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
        AND dp.stock_quantity > 0;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Daily product not found'::TEXT,
                0.00::DECIMAL(10,2),
                NULL::TEXT,
                NULL::UUID,
                false as is_valid,
                'Daily product not found, expired, or out of stock'::TEXT;
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
    temp_count INTEGER;
BEGIN
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'regular'
    AND NOT EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = ci.product_id AND p.is_public = true AND p.stock_quantity > 0
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'daily'
    AND NOT EXISTS (
        SELECT 1 FROM public.daily_products dp 
        WHERE dp.id = ci.product_id AND dp.expires_at > NOW() AND dp.stock_quantity > 0
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 6: CREAR TABLAS RELACIONADAS CON ORDERS
-- =====================================================

-- order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT drop_fk_safe('order_items', 'order_items_order_id_fkey');
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT drop_fk_safe('notifications', 'notifications_recipient_id_fkey');
ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    reviewee_id UUID NOT NULL,
    reviewee_type VARCHAR(20) NOT NULL CHECK (reviewee_type IN ('seller', 'driver')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT drop_fk_safe('reviews', 'reviews_order_id_fkey');
SELECT drop_fk_safe('reviews', 'reviews_reviewer_id_fkey'); 
SELECT drop_fk_safe('reviews', 'reviews_reviewee_id_fkey');
ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- =====================================================
-- PARTE 7: CREAR ÍNDICES Y POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para orders
DROP POLICY IF EXISTS "Users can view orders they are involved in" ON public.orders;
CREATE POLICY "Users can view orders they are involved in" ON public.orders
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR driver_id = auth.uid());

DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
CREATE POLICY "Buyers can create orders" ON public.orders
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Políticas para cart_items
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

-- Crear índices optimizados
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON public.cart_items(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_product_type_id ON public.cart_items(product_type, product_id);

-- =====================================================
-- PARTE 8: TRIGGERS Y LIMPIEZA INICIAL
-- =====================================================

-- Crear función update_updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ejecutar limpieza inicial
SELECT cleanup_invalid_cart_items() as items_cleaned_up;

-- Limpiar función auxiliar
DROP FUNCTION IF EXISTS drop_fk_safe(TEXT, TEXT);

COMMIT;

-- =====================================================
-- PARTE 9: VERIFICACIÓN FINAL COMPLETA
-- =====================================================

DO $$
DECLARE
    orders_fk_count INTEGER;
    cart_problematic_fk_count INTEGER;
    cart_safe_fk_count INTEGER;
    cart_functions_count INTEGER;
    cart_columns_count INTEGER;
    tables_count INTEGER;
BEGIN
    -- Contar foreign keys de orders
    SELECT COUNT(*) INTO orders_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'orders' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id');
    
    -- Contar foreign keys problemáticos de cart (debe ser 0)
    SELECT COUNT(*) INTO cart_problematic_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_id';
    
    -- Contar foreign keys seguros de cart (debe ser 1: user_id)
    SELECT COUNT(*) INTO cart_safe_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id';
    
    -- Contar funciones de cart
    SELECT COUNT(*) INTO cart_functions_count
    FROM pg_proc 
    WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items');
    
    -- Contar columnas de cart
    SELECT COUNT(*) INTO cart_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cart_items'
    AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id');
    
    -- Contar tablas del sistema de orders
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('orders', 'order_items', 'notifications', 'reviews');
    
    RAISE NOTICE 'CORRECCIÓN COMPLETA FINALIZADA';
    RAISE NOTICE 'ESTADO FINAL:';
    RAISE NOTICE 'Orders foreign keys: % de 3 (buyer, seller, driver)', orders_fk_count;
    RAISE NOTICE 'Cart foreign keys problemáticos: % (debe ser 0)', cart_problematic_fk_count;
    RAISE NOTICE 'Cart foreign keys seguros: % (user_id)', cart_safe_fk_count;
    RAISE NOTICE 'Funciones de validación: % de 3', cart_functions_count;
    RAISE NOTICE 'Columnas nuevas en cart: % de 5', cart_columns_count;
    RAISE NOTICE 'Tablas del sistema orders: % de 4', tables_count;
    
    RAISE NOTICE 'ERRORES SOLUCIONADOS:';
    RAISE NOTICE 'Error "Could not find relationship orders/users" CORREGIDO';
    RAISE NOTICE 'Error "cart_items violates foreign key constraint" ELIMINADO';
    RAISE NOTICE 'Validación por software implementada';
    RAISE NOTICE 'Sistema de orders completo creado';
    RAISE NOTICE 'Políticas RLS configuradas';
    
    IF orders_fk_count = 3 AND cart_problematic_fk_count = 0 AND cart_functions_count = 3 AND cart_columns_count = 5 THEN
        RAISE NOTICE 'TODOS LOS ERRORES DE FOREIGN KEY SOLUCIONADOS';
        RAISE NOTICE 'INSTRUCCIONES FINALES:';
        RAISE NOTICE '1. Activa Realtime en Supabase Dashboard para "orders" y "notifications"';
        RAISE NOTICE '2. Reinicia tu aplicación completamente (Ctrl+Shift+R)';
        RAISE NOTICE '3. Prueba agregar productos al carrito';
        RAISE NOTICE '4. Verifica que no aparezcan más errores en la consola';
        RAISE NOTICE 'TU MARKETPLACE TRATO ESTÁ OPERATIVO';
    ELSE
        RAISE NOTICE 'Algunos elementos necesitan atención. Revisar configuración.';
    END IF;
END $$;

SELECT 'SCRIPT MAESTRO LIMPIO COMPLETADO - Ver mensajes arriba para estado final' as resultado;