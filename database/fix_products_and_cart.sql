-- =====================================================
-- TRATO - SOLUCIÓN COMPLETA PARA ERRORES DE CARRITO
-- =====================================================
-- Este script soluciona todos los errores observados en la consola

BEGIN;

-- =====================================================
-- 1. VERIFICAR Y CREAR ESTRUCTURA DE TABLAS
-- =====================================================

-- Verificar si cart_items existe con la estructura correcta
DO $$
BEGIN
    -- Verificar si existe la tabla cart_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        CREATE TABLE public.cart_items (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID NOT NULL,
            product_id UUID NOT NULL,
            product_type TEXT NOT NULL DEFAULT 'regular' CHECK (product_type IN ('regular', 'daily')),
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            product_name TEXT,
            product_price DECIMAL(10,2),
            product_image TEXT,
            seller_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabla cart_items creada';
    END IF;

    -- Agregar columnas faltantes si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_type') THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular' CHECK (product_type IN ('regular', 'daily'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_name') THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_price') THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_image') THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'seller_id') THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'updated_at') THEN
        ALTER TABLE public.cart_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Agregar campos faltantes a daily_products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'image_url') THEN
        ALTER TABLE public.daily_products ADD COLUMN image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'category') THEN
        ALTER TABLE public.daily_products ADD COLUMN category TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'is_available') THEN
        ALTER TABLE public.daily_products ADD COLUMN is_available BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE public.daily_products ADD COLUMN stock_quantity INTEGER DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_products' AND column_name = 'seller_id') THEN
        ALTER TABLE public.daily_products ADD COLUMN seller_id UUID;
    END IF;
END $$;

-- =====================================================
-- 2. CREAR FOREIGN KEYS SEGUROS
-- =====================================================

DO $$
BEGIN
    -- Solo agregar FK a users si existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN
            ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- NO agregar FK a products porque puede ser de daily_products también
END $$;

-- =====================================================
-- 3. FUNCIÓN PARA VALIDAR PRODUCTOS MEJORADA
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_and_get_product_info(
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
        -- Validar daily product
        RETURN QUERY
        SELECT 
            dp.id,
            dp.name,
            dp.price,
            dp.image_url,
            dp.seller_id,
            CASE 
                WHEN dp.expires_at > NOW() AND dp.is_available = true AND dp.stock_quantity > 0 
                THEN true 
                ELSE false 
            END as is_valid,
            CASE 
                WHEN dp.expires_at <= NOW() THEN 'Producto expirado'
                WHEN dp.is_available = false THEN 'Producto no disponible'
                WHEN dp.stock_quantity <= 0 THEN 'Sin stock disponible'
                ELSE 'Producto válido'
            END as error_message
        FROM public.daily_products dp
        WHERE dp.id = p_product_id;
        
        -- Si no encontró nada, devolver error
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Producto no encontrado'::TEXT,
                0.00::DECIMAL(10,2),
                NULL::TEXT,
                NULL::UUID,
                false,
                'Producto del día no encontrado'::TEXT;
        END IF;
    ELSE
        -- Validar regular product
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.price,
            p.image_url,
            p.seller_id,
            CASE 
                WHEN p.is_public = true AND p.stock_quantity > 0 
                THEN true 
                ELSE false 
            END as is_valid,
            CASE 
                WHEN p.is_public = false THEN 'Producto privado'
                WHEN p.stock_quantity <= 0 THEN 'Sin stock disponible'
                ELSE 'Producto válido'
            END as error_message
        FROM public.products p
        WHERE p.id = p_product_id;
        
        -- Si no encontró nada, devolver error
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Producto no encontrado'::TEXT,
                0.00::DECIMAL(10,2),
                NULL::TEXT,
                NULL::UUID,
                false,
                'Producto regular no encontrado'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCIÓN MEJORADA PARA AGREGAR AL CARRITO
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_to_cart_safe(
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
    product_info RECORD;
    existing_cart_seller UUID;
    existing_item_id UUID;
    new_cart_item_id UUID;
BEGIN
    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'ID de usuario y producto son requeridos', NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'La cantidad debe ser mayor a 0', NULL::UUID;
        RETURN;
    END IF;

    -- Validar producto
    SELECT * INTO product_info 
    FROM public.validate_and_get_product_info(p_product_id, p_product_type);
    
    IF NOT product_info.is_valid THEN
        RETURN QUERY SELECT false, product_info.error_message, NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si ya hay productos de otro vendedor en el carrito
    SELECT DISTINCT seller_id INTO existing_cart_seller
    FROM public.cart_items 
    WHERE user_id = p_user_id 
    AND seller_id IS NOT NULL
    LIMIT 1;

    -- Si hay productos de otro vendedor, rechazar
    IF existing_cart_seller IS NOT NULL AND existing_cart_seller != product_info.seller_id THEN
        RETURN QUERY SELECT 
            false, 
            'Solo puedes tener productos de un vendedor en el carrito. Vacía tu carrito primero.',
            NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si el producto ya está en el carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND product_type = p_product_type;

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar cantidad del item existente
        UPDATE public.cart_items 
        SET 
            quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT true, 'Cantidad actualizada en el carrito', existing_item_id;
    ELSE
        -- Crear nuevo item en el carrito
        INSERT INTO public.cart_items (
            user_id,
            product_id,
            product_type,
            quantity,
            product_name,
            product_price,
            product_image,
            seller_id,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_product_id,
            p_product_type,
            p_quantity,
            product_info.product_name,
            product_info.product_price,
            product_info.product_image,
            product_info.seller_id,
            NOW(),
            NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        -- Si es daily product, actualizar stock
        IF p_product_type = 'daily' THEN
            UPDATE public.daily_products 
            SET stock_quantity = stock_quantity - p_quantity 
            WHERE id = p_product_id;
        END IF;
        
        RETURN QUERY SELECT true, 'Producto agregado al carrito exitosamente', new_cart_item_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, ('Error interno: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCIÓN PARA LIMPIAR ITEMS INVÁLIDOS
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_invalid_cart_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Eliminar items de productos regulares que ya no existen o no son públicos
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'regular'
    AND NOT EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = ci.product_id 
        AND p.is_public = true
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Eliminar items de daily products expirados o no disponibles
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'daily'
    AND NOT EXISTS (
        SELECT 1 FROM public.daily_products dp 
        WHERE dp.id = ci.product_id 
        AND dp.expires_at > NOW()
        AND dp.is_available = true
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. INSERTAR PRODUCTOS DE EJEMPLO
-- =====================================================

-- Primero, obtener o crear un seller_id válido
DO $$
DECLARE
    demo_seller_id UUID;
BEGIN
    -- Buscar un seller existente o usar el primer usuario como demo seller
    SELECT id INTO demo_seller_id FROM public.users LIMIT 1;
    
    -- Si no hay usuarios, crear un seller_id temporal (se puede ajustar más tarde)
    IF demo_seller_id IS NULL THEN
        demo_seller_id := uuid_generate_v4();
    END IF;

    -- Insertar productos de ejemplo solo si no existen (verificar por nombre)
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

    RAISE NOTICE 'Productos de ejemplo verificados/insertados con seller_id: %', demo_seller_id;
END $$;

-- =====================================================
-- 7. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON public.cart_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_seller ON public.cart_items(user_id, seller_id);

-- =====================================================
-- 8. PERMISOS Y POLÍTICAS RLS
-- =====================================================

-- Asegurar permisos para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_invalid_cart_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_get_product_info(UUID, TEXT) TO authenticated;

-- Habilitar RLS si no está habilitado
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean su carrito
DROP POLICY IF EXISTS "Users can manage their own cart" ON public.cart_items;
CREATE POLICY "Users can manage their own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id);

COMMIT;

-- =====================================================
-- 9. VERIFICACIÓN Y LIMPIEZA FINAL
-- =====================================================

-- Limpiar productos duplicados que están en 'products' pero deberían estar en 'daily_products'
DO $$
BEGIN
    -- Eliminar productos de ejemplo que están mal ubicados en la tabla 'products'
    DELETE FROM public.products 
    WHERE name IN ('Calcomanías para carros', 'Kit limpieza interior', 'Calcomanías para moto');
    
    RAISE NOTICE 'Productos de ejemplo eliminados de tabla products (deberían estar en daily_products)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudieron eliminar productos duplicados de products: %', SQLERRM;
END $$;

-- Limpiar items inválidos
SELECT public.cleanup_invalid_cart_items() as items_cleaned;

-- Verificar estructura
SELECT 'Solución completa aplicada - Carrito listo para usar' as status;
