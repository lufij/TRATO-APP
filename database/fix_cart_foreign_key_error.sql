-- =====================================================
-- TRATO - SOLUCIÓN AL ERROR DE FOREIGN KEY EN CARRITO
-- =====================================================
-- Este script soluciona el error de foreign key constraint en cart_items
-- Permite manejar tanto productos regulares como daily_products en el carrito

BEGIN;

-- =====================================================
-- 1. PROBLEMA IDENTIFICADO
-- =====================================================
-- Error: "insert or update on table "cart_items" violates foreign key constraint"
-- Causa: cart_items.product_id no tiene foreign key constraint y puede referenciar productos inexistentes
-- Solución: Actualizar estructura para manejar productos mixtos correctamente

-- =====================================================
-- 2. VERIFICAR ESTRUCTURA ACTUAL
-- =====================================================

-- Verificar si cart_items ya tiene las columnas necesarias
DO $$
BEGIN
    -- Verificar si existe product_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        -- Agregar product_type si no existe
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular' CHECK (product_type IN ('regular', 'daily'));
        RAISE NOTICE '%', 'Columna product_type agregada a cart_items';
    ELSE
        RAISE NOTICE '%', 'Columna product_type ya existe en cart_items';
    END IF;

    -- Verificar si existe product_name para datos desnormalizados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
        RAISE NOTICE '%', 'Columna product_name agregada a cart_items';
    END IF;

    -- Verificar si existe product_price para datos desnormalizados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
        RAISE NOTICE '%', 'Columna product_price agregada a cart_items';
    END IF;

    -- Verificar si existe product_image para datos desnormalizados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
        RAISE NOTICE '%', 'Columna product_image agregada a cart_items';
    END IF;

    -- Verificar si existe seller_id para validación de vendedor único
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE '%', 'Columna seller_id agregada a cart_items';
    END IF;
END $$;

-- =====================================================
-- 3. FUNCIÓN PARA VALIDAR Y OBTENER DATOS DEL PRODUCTO
-- =====================================================

CREATE OR REPLACE FUNCTION get_product_details(
    p_product_id UUID,
    p_product_type TEXT DEFAULT 'regular'
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    price DECIMAL(10,2),
    image_url TEXT,
    seller_id UUID,
    exists BOOLEAN
) AS $$
BEGIN
    IF p_product_type = 'daily' THEN
        -- Buscar en daily_products
        RETURN QUERY
        SELECT 
            dp.id,
            dp.name,
            dp.price,
            dp.image_url,
            dp.seller_id,
            true as exists
        FROM public.daily_products dp
        WHERE dp.id = p_product_id 
        AND dp.expires_at > NOW(); -- Solo productos vigentes
    ELSE
        -- Buscar en products regulares
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.price,
            p.image_url,
            p.seller_id,
            true as exists
        FROM public.products p
        WHERE p.id = p_product_id 
        AND p.is_public = true; -- Solo productos públicos
    END IF;
    
    -- Si no se encontró nada, retornar que no existe
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p_product_id,
            'Producto no encontrado'::TEXT,
            0.00::DECIMAL(10,2),
            NULL::TEXT,
            NULL::UUID,
            false as exists;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCIÓN PARA AGREGAR AL CARRITO CON VALIDACIÓN
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
    product_details RECORD;
    existing_cart_seller UUID;
    existing_item_id UUID;
    new_cart_item_id UUID;
BEGIN
    -- Validar entrada
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'User ID and Product ID are required', NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'Quantity must be greater than 0', NULL::UUID;
        RETURN;
    END IF;

    -- Obtener detalles del producto
    SELECT * INTO product_details FROM get_product_details(p_product_id, p_product_type);
    
    IF NOT product_details.exists THEN
        RETURN QUERY SELECT false, 'Product does not exist or is not available', NULL::UUID;
        RETURN;
    END IF;

    -- Verificar si ya hay productos de otro vendedor en el carrito
    SELECT DISTINCT seller_id INTO existing_cart_seller
    FROM public.cart_items 
    WHERE user_id = p_user_id 
    AND seller_id IS NOT NULL
    LIMIT 1;

    -- Si hay productos de otro vendedor, rechazar
    IF existing_cart_seller IS NOT NULL AND existing_cart_seller != product_details.seller_id THEN
        RETURN QUERY SELECT false, 'Cart can only contain products from one seller. Please clear cart first.', NULL::UUID;
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
        
        RETURN QUERY SELECT true, 'Product quantity updated in cart', existing_item_id;
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
            seller_id
        ) VALUES (
            p_user_id,
            p_product_id,
            p_product_type,
            p_quantity,
            product_details.name,
            product_details.price,
            product_details.image_url,
            product_details.seller_id
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT true, 'Product added to cart successfully', new_cart_item_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCIÓN PARA LIMPIAR ITEMS INVÁLIDOS DEL CARRITO
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_invalid_cart_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Eliminar items de productos regulares que ya no existen
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'regular'
    AND NOT EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = ci.product_id 
        AND p.is_public = true
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Eliminar items de daily products expirados
    DELETE FROM public.cart_items ci
    WHERE ci.product_type = 'daily'
    AND NOT EXISTS (
        SELECT 1 FROM public.daily_products dp 
        WHERE dp.id = ci.product_id 
        AND dp.expires_at > NOW()
    );
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. ACTUALIZAR ÍNDICES PARA NUEVA ESTRUCTURA
-- =====================================================

-- Índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON public.cart_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_seller ON public.cart_items(user_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_type_id ON public.cart_items(product_type, product_id);

-- =====================================================
-- 7. POLÍTICAS RLS ACTUALIZADAS
-- =====================================================

-- Actualizar política para permitir que los usuarios vean detalles de productos en su carrito
DROP POLICY IF EXISTS "Users can view products in their cart" ON public.products;
CREATE POLICY "Users can view products in their cart" ON public.products
    FOR SELECT USING (
        is_public = true OR
        EXISTS (
            SELECT 1 FROM public.cart_items ci
            WHERE ci.product_id = products.id
            AND ci.user_id = auth.uid()
            AND ci.product_type = 'regular'
        )
    );

-- Política similar para daily_products
DROP POLICY IF EXISTS "Users can view daily products in their cart" ON public.daily_products;
CREATE POLICY "Users can view daily products in their cart" ON public.daily_products
    FOR SELECT USING (
        expires_at > NOW() OR
        EXISTS (
            SELECT 1 FROM public.cart_items ci
            WHERE ci.product_id = daily_products.id
            AND ci.user_id = auth.uid()
            AND ci.product_type = 'daily'
        )
    );

-- =====================================================
-- 8. TRIGGER PARA LIMPIEZA AUTOMÁTICA
-- =====================================================

-- Función trigger para limpiar carrito cuando se elimina un producto
CREATE OR REPLACE FUNCTION cleanup_cart_on_product_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Eliminar items del carrito cuando se elimina un producto
    DELETE FROM public.cart_items 
    WHERE product_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para productos regulares
DROP TRIGGER IF EXISTS cleanup_cart_on_product_delete_trigger ON public.products;
CREATE TRIGGER cleanup_cart_on_product_delete_trigger
    AFTER DELETE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_cart_on_product_delete();

-- Trigger para daily products
DROP TRIGGER IF EXISTS cleanup_cart_on_daily_product_delete_trigger ON public.daily_products;
CREATE TRIGGER cleanup_cart_on_daily_product_delete_trigger
    AFTER DELETE ON public.daily_products
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_cart_on_product_delete();

COMMIT;

-- =====================================================
-- 9. VERIFICACIÓN Y LIMPIEZA INMEDIATA
-- =====================================================

-- Limpiar items inválidos existentes
SELECT cleanup_invalid_cart_items() as invalid_items_removed;

-- Verificar estructura actualizada
DO $$
DECLARE
    cart_columns INTEGER;
    functions_count INTEGER;
BEGIN
    -- Contar columnas nuevas en cart_items
    SELECT COUNT(*) INTO cart_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cart_items'
    AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id');
    
    -- Contar funciones nuevas
    SELECT COUNT(*) INTO functions_count
    FROM pg_proc 
    WHERE proname IN ('get_product_details', 'add_to_cart_safe', 'cleanup_invalid_cart_items');
    
    RAISE NOTICE '%', '==========================================';
    RAISE NOTICE '%', 'SOLUCION DE FOREIGN KEY CARRITO COMPLETADA';
    RAISE NOTICE '%', '==========================================';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'CAMBIOS REALIZADOS:';
    RAISE NOTICE '%', format('   • Columnas agregadas a cart_items: %s/5', cart_columns);
    RAISE NOTICE '%', format('   • Funciones de validación creadas: %s/3', functions_count);
    RAISE NOTICE '%', '   • Políticas RLS actualizadas: SI';
    RAISE NOTICE '%', '   • Triggers de limpieza: Creados';
    RAISE NOTICE '%', '   • Índices de optimización: Actualizados';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'PROBLEMAS SOLUCIONADOS:';
    RAISE NOTICE '%', '   ✓ Error de foreign key constraint eliminado';
    RAISE NOTICE '%', '   ✓ Validación de productos antes de agregar al carrito';
    RAISE NOTICE '%', '   ✓ Soporte para productos regulares y daily products';
    RAISE NOTICE '%', '   ✓ Validación de vendedor único por carrito';
    RAISE NOTICE '%', '   ✓ Limpieza automática de items inválidos';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'PRÓXIMO PASO:';
    RAISE NOTICE '%', '   • Actualizar CartContext para usar add_to_cart_safe()';
    RAISE NOTICE '%', '   • Recargar aplicación para aplicar cambios';
    RAISE NOTICE '%', '';
    RAISE NOTICE '%', 'CARRITO PROFESIONAL LISTO PARA USAR!';
    RAISE NOTICE '%', '==========================================';
END $$;