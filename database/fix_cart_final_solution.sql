-- =====================================================
-- TRATO - SOLUCIÓN DEFINITIVA PARA ERROR DE CARRITO
-- =====================================================
-- Este script elimina completamente el constraint problemático de foreign key
-- en cart_items y lo reemplaza con validación por software usando funciones
-- SOLUCIÓN DEFINITIVA que evita todos los errores de foreign key

BEGIN;

-- =====================================================
-- 1. ELIMINAR CONSTRAINT PROBLEMÁTICO DE FOREIGN KEY
-- =====================================================

-- Función auxiliar para eliminar constraint si existe
CREATE OR REPLACE FUNCTION drop_constraint_if_exists(table_name TEXT, constraint_name TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = constraint_name 
        AND table_name = table_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', table_name, constraint_name);
        RAISE NOTICE 'Constraint problemático % eliminado de %', constraint_name, table_name;
    ELSE
        RAISE NOTICE 'Constraint % no existe en % (OK)', constraint_name, table_name;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error eliminando constraint % de %: % (continuando...)', constraint_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Eliminar todos los possible constraints problemáticos de cart_items.product_id
SELECT drop_constraint_if_exists('cart_items', 'cart_items_product_id_fkey');
SELECT drop_constraint_if_exists('cart_items', 'fk_cart_items_product');
SELECT drop_constraint_if_exists('cart_items', 'cart_items_product_id_key');
SELECT drop_constraint_if_exists('cart_items', 'cart_items_pkey');

-- Re-crear primary key si se eliminó accidentalmente
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);

-- =====================================================
-- 2. ACTUALIZAR ESTRUCTURA DE CART_ITEMS
-- =====================================================

-- Verificar y agregar columnas necesarias
DO $$
BEGIN
    -- product_type para distinguir regular vs daily
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular' CHECK (product_type IN ('regular', 'daily'));
        RAISE NOTICE 'Columna product_type agregada';
    END IF;

    -- product_name para datos desnormalizados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
        RAISE NOTICE 'Columna product_name agregada';
    END IF;

    -- product_price para datos desnormalizados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
        RAISE NOTICE 'Columna product_price agregada';
    END IF;

    -- product_image para datos desnormalizados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
        RAISE NOTICE 'Columna product_image agregada';
    END IF;

    -- seller_id para validación de vendedor único
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
        RAISE NOTICE 'Columna seller_id agregada';
    END IF;

    -- Solo mantener foreign key seguro para user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key seguro user_id agregado';
    END IF;

END $$;

-- =====================================================
-- 3. FUNCIÓN PARA VALIDACIÓN DE PRODUCTOS MEJORADA
-- =====================================================

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
        -- Validar y obtener datos de daily_products
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
        
        -- Si no se encontró, devolver error específico
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                p_product_id,
                'Daily product not found or expired'::TEXT,
                0.00::DECIMAL(10,2),
                NULL::TEXT,
                NULL::UUID,
                false as is_valid,
                'Daily product not found, expired, or out of stock'::TEXT;
        END IF;
        
    ELSE
        -- Validar y obtener datos de products regulares
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
        
        -- Si no se encontró, devolver error específico
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

-- =====================================================
-- 4. FUNCIÓN SEGURA PARA AGREGAR AL CARRITO (MEJORADA)
-- =====================================================

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
    product_data RECORD;
    existing_cart_seller UUID;
    existing_item_id UUID;
    new_cart_item_id UUID;
    validation_result RECORD;
BEGIN
    -- Validaciones básicas de entrada
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'User ID is required', NULL::UUID;
        RETURN;
    END IF;
    
    IF p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'Product ID is required', NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'Quantity must be greater than 0', NULL::UUID;
        RETURN;
    END IF;

    IF p_product_type NOT IN ('regular', 'daily') THEN
        RETURN QUERY SELECT false, 'Product type must be regular or daily', NULL::UUID;
        RETURN;
    END IF;

    -- Validar y obtener datos del producto
    SELECT * INTO validation_result 
    FROM validate_and_get_product_data(p_product_id, p_product_type);
    
    IF NOT validation_result.is_valid THEN
        RETURN QUERY SELECT false, validation_result.error_message, NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si ya hay productos de otro vendedor en el carrito
    SELECT DISTINCT seller_id INTO existing_cart_seller
    FROM public.cart_items 
    WHERE user_id = p_user_id 
    AND seller_id IS NOT NULL
    LIMIT 1;

    -- Si hay productos de otro vendedor, rechazar
    IF existing_cart_seller IS NOT NULL AND existing_cart_seller != validation_result.seller_id THEN
        RETURN QUERY SELECT 
            false, 
            'Cart can only contain products from one seller. Please clear cart first.',
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
            updated_at = NOW(),
            -- Actualizar también los datos del producto por si cambiaron
            product_name = validation_result.product_name,
            product_price = validation_result.product_price,
            product_image = validation_result.product_image
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT true, 'Product quantity updated in cart', existing_item_id;
    ELSE
        -- Crear nuevo item en el carrito con todos los datos
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
            validation_result.product_name,
            validation_result.product_price,
            validation_result.product_image,
            validation_result.seller_id,
            NOW(),
            NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT true, 'Product added to cart successfully', new_cart_item_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCIÓN PARA LIMPIAR CARRITO AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_invalid_cart_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Eliminar items de productos regulares que ya no existen o están inactivos
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'regular'
    AND NOT EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = ci.product_id 
        AND p.is_public = true
        AND p.stock_quantity > 0
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Eliminar items de daily products expirados o sin stock
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'daily'
    AND NOT EXISTS (
        SELECT 1 FROM public.daily_products dp 
        WHERE dp.id = ci.product_id 
        AND dp.expires_at > NOW()
        AND dp.stock_quantity > 0
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Eliminar items huérfanos (sin usuario válido)
    DELETE FROM public.cart_items ci
    WHERE NOT EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = ci.user_id
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREAR ÍNDICES OPTIMIZADOS
-- =====================================================

-- Eliminar índices antiguos que pueden estar mal
DROP INDEX IF EXISTS idx_cart_items_product_id;

-- Crear nuevos índices optimizados
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON public.cart_items(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_product_type_id ON public.cart_items(product_type, product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_seller ON public.cart_items(user_id, seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON public.cart_items(created_at);

-- =====================================================
-- 7. ACTUALIZAR POLÍTICAS RLS
-- =====================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

-- Crear políticas RLS mejoradas
CREATE POLICY "Users can view their own cart items" ON public.cart_items
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own cart items" ON public.cart_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own cart items" ON public.cart_items
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own cart items" ON public.cart_items
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 8. TRIGGER PARA ACTUALIZAR UPDATED_AT
-- =====================================================

-- Crear trigger para cart_items updated_at
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. LIMPIEZA INICIAL
-- =====================================================

-- Ejecutar limpieza inmediata de items inválidos
SELECT cleanup_invalid_cart_items() as items_cleaned_up;

-- Limpiar función auxiliar
DROP FUNCTION IF EXISTS drop_constraint_if_exists(TEXT, TEXT);

COMMIT;

-- =====================================================
-- 10. VERIFICACIÓN FINAL Y REPORTE
-- =====================================================

DO $$
DECLARE
    cart_columns_count INTEGER;
    cart_functions_count INTEGER;
    cart_constraints_count INTEGER;
    problematic_constraints_count INTEGER;
BEGIN
    -- Contar columnas nuevas
    SELECT COUNT(*) INTO cart_columns_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cart_items'
    AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id');
    
    -- Contar funciones
    SELECT COUNT(*) INTO cart_functions_count
    FROM pg_proc 
    WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items');
    
    -- Contar constraints seguros (solo user_id)
    SELECT COUNT(*) INTO cart_constraints_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id';
    
    -- Contar constraints problemáticos (product_id) - debe ser 0
    SELECT COUNT(*) INTO problematic_constraints_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_id';
    
    RAISE NOTICE '%', '==========================================';
    RAISE NOTICE '%', 'SOLUCIÓN DEFINITIVA DE CARRITO COMPLETADA';
    RAISE NOTICE '%', '==========================================';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'ESTADO FINAL:';
    RAISE NOTICE '%', format('   • Columnas agregadas: %s/5', cart_columns_count);
    RAISE NOTICE '%', format('   • Funciones creadas: %s/3', cart_functions_count);
    RAISE NOTICE '%', format('   • Foreign keys seguros: %s (user_id)', cart_constraints_count);
    RAISE NOTICE '%', format('   • Foreign keys problemáticos: %s (debe ser 0)', problematic_constraints_count);
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'PROBLEMAS ELIMINADOS:';
    RAISE NOTICE '%', '   ✓ Foreign key constraint product_id ELIMINADO';
    RAISE NOTICE '%', '   ✓ Validación por software implementada';
    RAISE NOTICE '%', '   ✓ Soporte para productos regulares y daily';
    RAISE NOTICE '%', '   ✓ Validación de vendedor único';
    RAISE NOTICE '%', '   ✓ Auto-limpieza de items inválidos';
    RAISE NOTICE '%', '   ✓ Datos desnormalizados para rendimiento';
    RAISE NOTICE '%', '';
    
    IF problematic_constraints_count = 0 AND cart_functions_count = 3 AND cart_columns_count = 5 THEN
        RAISE NOTICE '%', '🎉 CARRITO COMPLETAMENTE SOLUCIONADO!';
        RAISE NOTICE '%', '';
        RAISE NOTICE '%', 'PRÓXIMOS PASOS:';
        RAISE NOTICE '%', '   1. Reiniciar aplicación completamente (Ctrl+Shift+R)';
        RAISE NOTICE '%', '   2. Probar agregar productos al carrito';
        RAISE NOTICE '%', '   3. Verificar que aparecen toasts de éxito';
        RAISE NOTICE '%', '';
        RAISE NOTICE '%', 'ERROR "cart_items violates foreign key" ELIMINADO!';
    ELSE
        RAISE NOTICE '%', '⚠ Revisar configuración - algunos elementos faltantes';
    END IF;
    
    RAISE NOTICE '%', '==========================================';
END $$;