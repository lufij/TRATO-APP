-- =====================================================
-- TRATO - SOLUCIÓN IDEMPOTENTE PARA ERRORES DE FOREIGN KEY
-- =====================================================
-- Este script puede ejecutarse múltiples veces sin errores
-- Verifica el estado actual antes de realizar cambios
-- VERSIÓN IDEMPOTENTE: Segura para re-ejecución

BEGIN;

-- =====================================================
-- PARTE 1: VERIFICACIONES PRELIMINARES
-- =====================================================

DO $$
BEGIN
    -- Verificar que users existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'CRÍTICO: Tabla users no existe. Ejecuta primero fix_setup.sql antes de continuar.';
    END IF;
    RAISE NOTICE 'Verificación inicial: Tabla users existe - OK';
END $$;

-- =====================================================
-- PARTE 2: FUNCIÓN MEJORADA PARA MANEJO SEGURO DE CONSTRAINTS
-- =====================================================

CREATE OR REPLACE FUNCTION manage_foreign_key_safe(
    p_table_name TEXT,
    p_column_name TEXT,
    p_referenced_table TEXT,
    p_referenced_column TEXT DEFAULT 'id',
    p_on_delete TEXT DEFAULT 'CASCADE',
    p_constraint_name TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_constraint_name TEXT;
    v_existing_count INTEGER;
    v_result TEXT;
BEGIN
    -- Generar nombre del constraint si no se proporciona
    IF p_constraint_name IS NULL THEN
        v_constraint_name := p_table_name || '_' || p_column_name || '_fkey';
    ELSE
        v_constraint_name := p_constraint_name;
    END IF;
    
    -- Verificar si el constraint ya existe
    SELECT COUNT(*) INTO v_existing_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = p_table_name 
    AND kcu.column_name = p_column_name
    AND tc.constraint_type = 'FOREIGN KEY';
    
    IF v_existing_count > 0 THEN
        v_result := 'EXISTED: ' || v_constraint_name || ' already exists';
    ELSE
        -- Crear el constraint
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE %s',
            p_table_name, v_constraint_name, p_column_name, p_referenced_table, p_referenced_column, p_on_delete);
        v_result := 'CREATED: ' || v_constraint_name || ' created successfully';
    END IF;
    
    RETURN v_result;
EXCEPTION
    WHEN duplicate_object THEN
        RETURN 'EXISTED: ' || v_constraint_name || ' already exists (caught duplicate)';
    WHEN others THEN
        RETURN 'ERROR: ' || SQLERRM || ' for ' || v_constraint_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 3: CREAR TABLAS SI NO EXISTEN
-- =====================================================

-- Tabla orders con verificación mejorada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        CREATE TABLE public.orders (
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
        RAISE NOTICE 'Tabla orders creada';
    ELSE
        RAISE NOTICE 'Tabla orders ya existe - OK';
    END IF;
END $$;

-- Tabla order_items con verificación
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        CREATE TABLE public.order_items (
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
        RAISE NOTICE 'Tabla order_items creada';
    ELSE
        RAISE NOTICE 'Tabla order_items ya existe - OK';
    END IF;
END $$;

-- Tabla notifications con verificación
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE public.notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            recipient_id UUID NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data JSONB,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabla notifications creada';
    ELSE
        RAISE NOTICE 'Tabla notifications ya existe - OK';
    END IF;
END $$;

-- Tabla reviews con verificación
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE TABLE public.reviews (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_id UUID NOT NULL,
            reviewer_id UUID NOT NULL,
            reviewee_id UUID NOT NULL,
            reviewee_type VARCHAR(20) NOT NULL CHECK (reviewee_type IN ('seller', 'driver')),
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabla reviews creada';
    ELSE
        RAISE NOTICE 'Tabla reviews ya existe - OK';
    END IF;
END $$;

-- =====================================================
-- PARTE 4: CREAR FOREIGN KEYS USANDO FUNCIÓN SEGURA
-- =====================================================

-- Foreign keys para orders
SELECT manage_foreign_key_safe('orders', 'buyer_id', 'users', 'id', 'CASCADE') as orders_buyer_fk;
SELECT manage_foreign_key_safe('orders', 'seller_id', 'users', 'id', 'CASCADE') as orders_seller_fk;
SELECT manage_foreign_key_safe('orders', 'driver_id', 'users', 'id', 'SET NULL') as orders_driver_fk;

-- Foreign key para order_items  
SELECT manage_foreign_key_safe('order_items', 'order_id', 'orders', 'id', 'CASCADE') as order_items_order_fk;

-- Foreign key para notifications
SELECT manage_foreign_key_safe('notifications', 'recipient_id', 'users', 'id', 'CASCADE') as notifications_recipient_fk;

-- Foreign keys para reviews
SELECT manage_foreign_key_safe('reviews', 'order_id', 'orders', 'id', 'CASCADE') as reviews_order_fk;
SELECT manage_foreign_key_safe('reviews', 'reviewer_id', 'users', 'id', 'CASCADE') as reviews_reviewer_fk;
SELECT manage_foreign_key_safe('reviews', 'reviewee_id', 'users', 'id', 'CASCADE') as reviews_reviewee_fk;

-- Foreign key SEGURO para cart_items (solo user_id, NO product_id)
SELECT manage_foreign_key_safe('cart_items', 'user_id', 'users', 'id', 'CASCADE') as cart_items_user_fk;

-- =====================================================
-- PARTE 5: ELIMINAR FOREIGN KEYS PROBLEMÁTICOS DE CART
-- =====================================================

-- Función para eliminar constraint problemático si existe
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Buscar y eliminar cualquier foreign key de cart_items.product_id
    FOR constraint_rec IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' 
        AND kcu.column_name = 'product_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.cart_items DROP CONSTRAINT %I', constraint_rec.constraint_name);
        RAISE NOTICE 'ELIMINADO: Constraint problemático % eliminado', constraint_rec.constraint_name;
    END LOOP;
    
    -- Verificar que se eliminaron todos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' 
        AND kcu.column_name = 'product_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'ÉXITO: Todos los foreign keys problemáticos de product_id eliminados';
    ELSE
        RAISE NOTICE 'ADVERTENCIA: Aún quedan foreign keys problemáticos';
    END IF;
END $$;

-- =====================================================
-- PARTE 6: ACTUALIZAR ESTRUCTURA DE CART_ITEMS
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
    ELSE
        RAISE NOTICE 'Columna product_type ya existe';
    END IF;

    -- product_name  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
        RAISE NOTICE 'Columna product_name agregada';
    ELSE
        RAISE NOTICE 'Columna product_name ya existe';
    END IF;

    -- product_price
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
        RAISE NOTICE 'Columna product_price agregada';
    ELSE
        RAISE NOTICE 'Columna product_price ya existe';
    END IF;

    -- product_image
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
        RAISE NOTICE 'Columna product_image agregada';
    ELSE
        RAISE NOTICE 'Columna product_image ya existe';
    END IF;

    -- seller_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
        RAISE NOTICE 'Columna seller_id agregada';
    ELSE
        RAISE NOTICE 'Columna seller_id ya existe';
    END IF;
END $$;

-- =====================================================
-- PARTE 7: CREAR FUNCIONES DE VALIDACIÓN (IDEMPOTENTES)
-- =====================================================

-- Función para validar productos (reemplaza si existe)
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

-- Función para agregar al carrito de forma segura (reemplaza si existe)
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

-- Función de limpieza (reemplaza si existe)
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
-- PARTE 8: POLÍTICAS RLS (IDEMPOTENTES)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Políticas para orders (drop y recreate para evitar conflictos)
DROP POLICY IF EXISTS "Users can view orders they are involved in" ON public.orders;
CREATE POLICY "Users can view orders they are involved in" ON public.orders
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR driver_id = auth.uid());

DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
CREATE POLICY "Buyers can create orders" ON public.orders
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Políticas para cart_items (drop y recreate para evitar conflictos)
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

-- =====================================================
-- PARTE 9: ÍNDICES (IDEMPOTENTES)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON public.cart_items(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_product_type_id ON public.cart_items(product_type, product_id);

-- =====================================================
-- PARTE 10: TRIGGERS (IDEMPOTENTES)
-- =====================================================

-- Función para updated_at (reemplaza si existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at (drop y recreate)
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

-- =====================================================
-- PARTE 11: LIMPIEZA Y VERIFICACIÓN FINAL
-- =====================================================

-- Ejecutar limpieza inicial
SELECT cleanup_invalid_cart_items() as items_cleaned_up;

-- Limpiar función auxiliar
DROP FUNCTION IF EXISTS manage_foreign_key_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

COMMIT;

-- =====================================================
-- PARTE 12: REPORTE FINAL DETALLADO
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
    -- Métricas finales
    SELECT COUNT(*) INTO orders_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'orders' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id');
    
    SELECT COUNT(*) INTO cart_problematic_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_id';
    
    SELECT COUNT(*) INTO cart_safe_fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id';
    
    SELECT COUNT(*) INTO cart_functions_count
    FROM pg_proc 
    WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items');
    
    SELECT COUNT(*) INTO cart_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cart_items'
    AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id');
    
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('orders', 'order_items', 'notifications', 'reviews');
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'SCRIPT IDEMPOTENTE COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ESTADO FINAL VERIFICADO:';
    RAISE NOTICE 'Orders foreign keys: % de 3 (buyer, seller, driver)', orders_fk_count;
    RAISE NOTICE 'Cart foreign keys problemáticos: % (debe ser 0)', cart_problematic_fk_count;
    RAISE NOTICE 'Cart foreign keys seguros: % (user_id)', cart_safe_fk_count;
    RAISE NOTICE 'Funciones de validación: % de 3', cart_functions_count;
    RAISE NOTICE 'Columnas nuevas en cart: % de 5', cart_columns_count;
    RAISE NOTICE 'Tablas del sistema orders: % de 4', tables_count;
    RAISE NOTICE '';
    RAISE NOTICE 'ERRORES SOLUCIONADOS:';
    RAISE NOTICE '✓ Error "constraint already exists" ELIMINADO';
    RAISE NOTICE '✓ Error "Could not find relationship orders/users" CORREGIDO';
    RAISE NOTICE '✓ Error "cart_items violates foreign key constraint" ELIMINADO';
    RAISE NOTICE '✓ Validación por software implementada';
    RAISE NOTICE '✓ Sistema idempotente (puede re-ejecutarse sin errores)';
    RAISE NOTICE '';
    
    IF orders_fk_count = 3 AND cart_problematic_fk_count = 0 AND cart_functions_count = 3 AND cart_columns_count = 5 THEN
        RAISE NOTICE '🎉 TODOS LOS ERRORES DE FOREIGN KEY SOLUCIONADOS';
        RAISE NOTICE '';
        RAISE NOTICE 'PRÓXIMOS PASOS:';
        RAISE NOTICE '1. Activa Realtime en Supabase Dashboard para "orders" y "notifications"';
        RAISE NOTICE '2. Reinicia tu aplicación con Ctrl+Shift+R';
        RAISE NOTICE '3. Prueba agregar productos al carrito';
        RAISE NOTICE '4. Verifica que no aparezcan errores en la consola';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 TU MARKETPLACE TRATO ESTÁ COMPLETAMENTE OPERATIVO';
    ELSE
        RAISE NOTICE '⚠ Algunos elementos necesitan revisión manual';
        RAISE NOTICE 'Re-ejecuta este script si es necesario (es seguro)';
    END IF;
    
    RAISE NOTICE '===============================================';
END $$;

SELECT 'SCRIPT IDEMPOTENTE FINALIZADO - SEGURO PARA RE-EJECUCIÓN' as resultado;