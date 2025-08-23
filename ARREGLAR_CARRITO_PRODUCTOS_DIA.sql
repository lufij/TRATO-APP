-- =====================================================
-- SOLUCIÓN RÁPIDA - PRODUCTOS DEL DÍA AL CARRITO
-- =====================================================
-- Ejecutar en SQL Editor de Supabase para arreglar carrito

-- 🗑️ LIMPIAR FUNCIONES EXISTENTES
DROP FUNCTION IF EXISTS public.add_to_cart_safe CASCADE;

-- ✅ CREAR FUNCIÓN SIMPLE Y FUNCIONAL
CREATE OR REPLACE FUNCTION public.add_to_cart_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_product_type TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cart_item_id UUID
) AS $$
DECLARE
    existing_item_id UUID;
    new_cart_item_id UUID;
    product_name_val TEXT;
    product_price_val DECIMAL(10,2);
    product_image_val TEXT;
    product_seller_id UUID;
BEGIN
    -- Validaciones básicas
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'ID de usuario y producto son requeridos'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'La cantidad debe ser mayor a 0'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Obtener información del producto según el tipo
    IF p_product_type = 'daily' THEN
        -- Buscar en daily_products
        SELECT name, price, image_url, seller_id 
        INTO product_name_val, product_price_val, product_image_val, product_seller_id
        FROM public.daily_products 
        WHERE id = p_product_id 
        AND stock_quantity > 0
        AND expires_at > NOW();
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto del día no disponible'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    ELSE
        -- Buscar en products regulares
        SELECT name, price, image_url, seller_id 
        INTO product_name_val, product_price_val, product_image_val, product_seller_id
        FROM public.products 
        WHERE id = p_product_id
        AND stock_quantity > 0;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Producto no disponible'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    -- Verificar si el producto ya está en el carrito
    SELECT id INTO existing_item_id
    FROM public.cart_items
    WHERE user_id = p_user_id 
    AND product_id = p_product_id 
    AND product_type = p_product_type;

    IF existing_item_id IS NOT NULL THEN
        -- Actualizar cantidad existente
        UPDATE public.cart_items 
        SET quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE id = existing_item_id;
        
        RETURN QUERY SELECT 
            true,
            'Cantidad actualizada en el carrito'::TEXT,
            existing_item_id;
    ELSE
        -- Crear nuevo item
        INSERT INTO public.cart_items (
            user_id, 
            product_id, 
            product_type, 
            quantity,
            product_name,
            product_price,
            product_image,
            seller_id,
            added_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_product_id,
            p_product_type,
            p_quantity,
            product_name_val,
            product_price_val,
            product_image_val,
            product_seller_id,
            NOW(),
            NOW()
        ) RETURNING id INTO new_cart_item_id;
        
        RETURN QUERY SELECT 
            true,
            'Producto agregado al carrito'::TEXT,
            new_cart_item_id;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        false,
        'Error: ' || SQLERRM,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PERMISOS
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- ✅ VERIFICAR TABLAS NECESARIAS
DO $$
BEGIN
    -- Verificar que cart_items tenga las columnas necesarias
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_type TEXT DEFAULT 'regular';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_price'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_price DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'product_image'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN product_image TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN seller_id UUID;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    RAISE NOTICE 'Estructura de cart_items verificada y actualizada';
END $$;

-- ✅ VERIFICACIÓN FINAL
SELECT 'add_to_cart_safe creada exitosamente' as status;
