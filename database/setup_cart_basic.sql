-- =====================================================
-- TRATO - SCRIPT DEFINITIVO PARA CARRITO
-- =====================================================
-- Este script elimina TODAS las funciones conflictivas

-- =====================================================
-- 1. ELIMINAR TODAS LAS FUNCIONES CONFLICTIVAS
-- =====================================================

-- Eliminar todas las versiones posibles de add_to_cart_safe
DROP FUNCTION IF EXISTS public.add_to_cart_safe(UUID, UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_to_cart_safe(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.add_to_cart_safe(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_to_cart_safe() CASCADE;

-- Verificar y eliminar cualquier función con ese nombre
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'add_to_cart_safe' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END $$;

-- =====================================================
-- 2. CREAR TABLA CART_ITEMS SI NO EXISTE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'regular',
    quantity INTEGER NOT NULL DEFAULT 1,
    product_name TEXT,
    product_price DECIMAL(10,2),
    product_image TEXT,
    seller_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREAR FUNCIÓN CON NOMBRE ÚNICO
-- =====================================================

CREATE FUNCTION public.add_product_to_cart(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_product_type TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cart_item_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_item_id UUID;
    new_cart_item_id UUID;
    product_name_val TEXT := 'Producto';
    product_price_val DECIMAL(10,2) := 0.00;
    product_image_val TEXT := '';
    product_seller_id UUID;
BEGIN
    -- Validar parámetros
    IF p_user_id IS NULL OR p_product_id IS NULL THEN
        RETURN QUERY SELECT false, 'Parámetros requeridos'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT false, 'Cantidad inválida'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Obtener datos del producto
    BEGIN
        IF p_product_type = 'daily' THEN
            SELECT name, price, image_url, seller_id 
            INTO product_name_val, product_price_val, product_image_val, product_seller_id
            FROM public.daily_products 
            WHERE id = p_product_id
            LIMIT 1;
        ELSE
            SELECT name, price, image_url, seller_id 
            INTO product_name_val, product_price_val, product_image_val, product_seller_id
            FROM public.products 
            WHERE id = p_product_id
            LIMIT 1;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, 'Error al buscar producto'::TEXT, NULL::UUID;
            RETURN;
    END;

    -- Verificar si ya existe en carrito
    BEGIN
        SELECT id INTO existing_item_id
        FROM public.cart_items
        WHERE user_id = p_user_id 
        AND product_id = p_product_id 
        AND product_type = p_product_type
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            existing_item_id := NULL;
    END;

    -- Agregar o actualizar
    BEGIN
        IF existing_item_id IS NOT NULL THEN
            -- Actualizar cantidad
            UPDATE public.cart_items 
            SET quantity = quantity + p_quantity,
                updated_at = NOW()
            WHERE id = existing_item_id;
            
            RETURN QUERY SELECT true, 'Cantidad actualizada'::TEXT, existing_item_id;
        ELSE
            -- Insertar nuevo
            INSERT INTO public.cart_items (
                user_id, product_id, product_type, quantity,
                product_name, product_price, product_image, seller_id,
                created_at, updated_at
            ) VALUES (
                p_user_id, p_product_id, p_product_type, p_quantity,
                COALESCE(product_name_val, 'Producto'),
                COALESCE(product_price_val, 0.00),
                COALESCE(product_image_val, ''),
                product_seller_id,
                NOW(), NOW()
            ) RETURNING id INTO new_cart_item_id;
            
            RETURN QUERY SELECT true, 'Producto agregado'::TEXT, new_cart_item_id;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, 'Error al guardar'::TEXT, NULL::UUID;
            RETURN;
    END;
END;
$$;

-- =====================================================
-- 4. CREAR ALIAS PARA COMPATIBILIDAD
-- =====================================================

CREATE FUNCTION public.add_to_cart_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_product_type TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cart_item_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.add_product_to_cart(p_user_id, p_product_id, p_quantity, p_product_type);
END;
$$;

-- =====================================================
-- 5. FUNCIÓN DE LIMPIEZA
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_invalid_cart_items()
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN 0;
END;
$$;

-- =====================================================
-- 6. PERMISOS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_product_to_cart TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_cart_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_invalid_cart_items TO authenticated;

-- =====================================================
-- 7. RLS
-- =====================================================

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own cart" ON public.cart_items;
CREATE POLICY "Users can manage their own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id);

SELECT 'Script definitivo ejecutado exitosamente' as status;
