-- Fix cart_items foreign key relationships
-- This should resolve the "Could not find a relationship between 'cart_items' and 'products'" error

BEGIN;

-- First, let's check if the tables exist
DO $$
BEGIN
    -- Check if cart_items table exists and has the right structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        -- Create cart_items table if it doesn't exist
        CREATE TABLE cart_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
        CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
        CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON cart_items(seller_id);
        CREATE INDEX IF NOT EXISTS idx_cart_items_product_type ON cart_items(product_type);
        CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at);
    END IF;

    -- Check if we have the foreign key constraints
    -- Remove existing foreign key constraints if they exist (to recreate them properly)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_items_user_id_fkey' 
        AND table_name = 'cart_items'
    ) THEN
        ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_fkey;
    END IF;

    -- Add foreign key to users table (this should exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE cart_items 
        ADD CONSTRAINT cart_items_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key to sellers table (this should exist) 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers') THEN
        -- Remove existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'cart_items_seller_id_fkey' 
            AND table_name = 'cart_items'
        ) THEN
            ALTER TABLE cart_items DROP CONSTRAINT cart_items_seller_id_fkey;
        END IF;
        
        ALTER TABLE cart_items 
        ADD CONSTRAINT cart_items_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;
    END IF;

    -- Important: DO NOT add foreign key constraint to products table
    -- The cart_items table stores product_id but doesn't need a foreign key constraint
    -- because products can be from either 'products' or 'daily_products' tables
    -- This is why the error mentions the relationship issue

    -- Create or replace the cleanup function
    CREATE OR REPLACE FUNCTION cleanup_invalid_cart_items()
    RETURNS void
    LANGUAGE plpgsql
    AS $function$
    BEGIN
        -- Clean up cart items with invalid users
        DELETE FROM cart_items 
        WHERE user_id NOT IN (SELECT id FROM users);
        
        -- Clean up cart items with invalid sellers (if seller_id is not null)
        DELETE FROM cart_items 
        WHERE seller_id IS NOT NULL 
        AND seller_id NOT IN (SELECT id FROM sellers);
        
        -- Clean up expired daily products from cart
        DELETE FROM cart_items 
        WHERE product_type = 'daily' 
        AND product_id NOT IN (
            SELECT id FROM daily_products 
            WHERE expires_at > NOW()
        );
        
        -- Clean up regular products that no longer exist
        DELETE FROM cart_items 
        WHERE product_type = 'regular' 
        AND product_id NOT IN (SELECT id FROM products);
        
        -- Update updated_at for remaining items
        UPDATE cart_items 
        SET updated_at = NOW() 
        WHERE updated_at IS NULL OR updated_at < created_at;
    END;
    $function$;

    -- Create or replace the add_to_cart_safe function
    CREATE OR REPLACE FUNCTION add_to_cart_safe(
        p_user_id UUID,
        p_product_id UUID,
        p_quantity INTEGER,
        p_product_type TEXT DEFAULT 'regular'
    )
    RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $function$
    DECLARE
        v_product_record RECORD;
        v_seller_id UUID;
        v_existing_seller_id UUID;
        v_existing_item_id UUID;
    BEGIN
        -- Validate input parameters
        IF p_user_id IS NULL OR p_product_id IS NULL OR p_quantity <= 0 THEN
            RETURN QUERY SELECT false, 'Parámetros inválidos'::text;
            RETURN;
        END IF;

        -- Validate product type
        IF p_product_type NOT IN ('regular', 'daily') THEN
            RETURN QUERY SELECT false, 'Tipo de producto inválido'::text;
            RETURN;
        END IF;

        -- Check if user exists
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
            RETURN QUERY SELECT false, 'Usuario no válido'::text;
            RETURN;
        END IF;

        -- Get product information based on type
        IF p_product_type = 'daily' THEN
            SELECT id, name, price, image_url, seller_id, expires_at
            INTO v_product_record
            FROM daily_products 
            WHERE id = p_product_id AND expires_at > NOW();
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT false, 'Producto del día no encontrado o expirado'::text;
                RETURN;
            END IF;
        ELSE
            SELECT id, name, price, image_url, seller_id
            INTO v_product_record
            FROM products 
            WHERE id = p_product_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT false, 'Producto no encontrado'::text;
                RETURN;
            END IF;
        END IF;

        v_seller_id := v_product_record.seller_id;

        -- Check if user already has items from a different seller
        SELECT seller_id INTO v_existing_seller_id
        FROM cart_items 
        WHERE user_id = p_user_id 
        LIMIT 1;

        IF FOUND AND v_existing_seller_id IS NOT NULL AND v_existing_seller_id != v_seller_id THEN
            RETURN QUERY SELECT false, 'Solo puedes tener productos de un vendedor en el carrito'::text;
            RETURN;
        END IF;

        -- Check if item already exists in cart
        SELECT id INTO v_existing_item_id
        FROM cart_items 
        WHERE user_id = p_user_id 
        AND product_id = p_product_id 
        AND product_type = p_product_type;

        IF FOUND THEN
            -- Update existing item quantity
            UPDATE cart_items 
            SET quantity = quantity + p_quantity,
                updated_at = NOW()
            WHERE id = v_existing_item_id;
            
            RETURN QUERY SELECT true, 'Cantidad actualizada en el carrito'::text;
        ELSE
            -- Insert new item
            INSERT INTO cart_items (
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
                v_product_record.name,
                v_product_record.price,
                v_product_record.image_url,
                v_seller_id,
                NOW(),
                NOW()
            );
            
            RETURN QUERY SELECT true, 'Producto agregado al carrito'::text;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, ('Error interno: ' || SQLERRM)::text;
    END;
    $function$;

    -- Grant necessary permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON cart_items TO authenticated;
    GRANT EXECUTE ON FUNCTION cleanup_invalid_cart_items() TO authenticated;
    GRANT EXECUTE ON FUNCTION add_to_cart_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

END;
$$;

COMMIT;

-- Verify the setup
SELECT 'Cart system setup completed successfully' as status;

-- Test the cleanup function
SELECT cleanup_invalid_cart_items();

-- Show cart_items table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cart_items' 
ORDER BY ordinal_position;