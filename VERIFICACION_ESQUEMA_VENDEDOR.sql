-- Script para verificar y corregir el esquema de órdenes del vendedor
-- Este script asegura que las columnas necesarias existan y tengan los tipos correctos

-- 1. Verificar y asegurar la existencia de columnas críticas en la tabla orders
DO $$
BEGIN
    -- Agregar seller_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN seller_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Agregada columna seller_id a orders';
    END IF;

    -- Agregar buyer_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'buyer_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN buyer_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Agregada columna buyer_id a orders';
    END IF;

    -- Asegurar que total_amount existe (para compatibilidad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10,2);
        RAISE NOTICE 'Agregada columna total_amount a orders';
    END IF;

    -- Asegurar que total existe (para retrocompatibilidad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'total'
    ) THEN
        ALTER TABLE orders ADD COLUMN total DECIMAL(10,2);
        RAISE NOTICE 'Agregada columna total a orders';
    END IF;

    -- Verificar customer_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_name TEXT;
        RAISE NOTICE 'Agregada columna customer_name a orders';
    END IF;

    -- Verificar delivery_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'delivery_type'
    ) THEN
        ALTER TABLE orders ADD COLUMN delivery_type TEXT DEFAULT 'pickup';
        RAISE NOTICE 'Agregada columna delivery_type a orders';
    END IF;

    -- Verificar status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'status'
    ) THEN
        ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Agregada columna status a orders';
    END IF;

    RAISE NOTICE 'Verificación de esquema de orders completada';
END $$;

-- 2. Verificar la tabla order_items
DO $$
BEGIN
    -- Verificar que order_items existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'order_items'
    ) THEN
        CREATE TABLE order_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
            product_id UUID,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            price_per_unit DECIMAL(10,2) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Creada tabla order_items';
    ELSE
        -- Verificar columnas de order_items
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'order_items' AND column_name = 'price_per_unit'
        ) THEN
            ALTER TABLE order_items ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Agregada columna price_per_unit a order_items';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'order_items' AND column_name = 'subtotal'
        ) THEN
            ALTER TABLE order_items ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Agregada columna subtotal a order_items';
        END IF;
    END IF;
END $$;

-- 3. Crear o actualizar función para sincronizar totales
CREATE OR REPLACE FUNCTION sync_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar total_amount basado en order_items
    UPDATE orders 
    SET 
        total_amount = (
            SELECT COALESCE(SUM(subtotal), 0) 
            FROM order_items 
            WHERE order_id = NEW.order_id
        ),
        total = (
            SELECT COALESCE(SUM(subtotal), 0) 
            FROM order_items 
            WHERE order_id = NEW.order_id
        ),
        updated_at = NOW()
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS sync_order_totals_trigger ON order_items;
CREATE TRIGGER sync_order_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_totals();

-- 5. Sincronizar totales existentes
DO $$
BEGIN
    UPDATE orders 
    SET 
        total_amount = COALESCE(
            (SELECT SUM(subtotal) FROM order_items WHERE order_id = orders.id), 
            total_amount, 
            total, 
            0
        ),
        total = COALESCE(
            (SELECT SUM(subtotal) FROM order_items WHERE order_id = orders.id), 
            total_amount, 
            total, 
            0
        )
    WHERE EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id);
    
    RAISE NOTICE 'Sincronizados totales existentes';
END $$;

-- 6. Crear índices para optimizar consultas de vendedor
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 7. Verificar permisos RLS (Row Level Security)
DO $$
BEGIN
    -- Habilitar RLS en orders si no está habilitado
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    
    -- Política para vendedores (pueden ver sus propias órdenes)
    DROP POLICY IF EXISTS "sellers_can_view_own_orders" ON orders;
    CREATE POLICY "sellers_can_view_own_orders" ON orders
        FOR SELECT USING (
            auth.uid() = seller_id OR 
            auth.uid() = buyer_id OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );

    -- Política para insertar órdenes
    DROP POLICY IF EXISTS "buyers_can_create_orders" ON orders;
    CREATE POLICY "buyers_can_create_orders" ON orders
        FOR INSERT WITH CHECK (
            auth.uid() = buyer_id OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'vendedor')
            )
        );

    -- Política para actualizar órdenes
    DROP POLICY IF EXISTS "sellers_can_update_own_orders" ON orders;
    CREATE POLICY "sellers_can_update_own_orders" ON orders
        FOR UPDATE USING (
            auth.uid() = seller_id OR 
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );

    RAISE NOTICE 'Políticas RLS configuradas para orders';
END $$;

-- 8. Configurar RLS para order_items
DO $$
BEGIN
    ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
    
    -- Los usuarios pueden ver items de órdenes que les pertenecen
    DROP POLICY IF EXISTS "users_can_view_order_items" ON order_items;
    CREATE POLICY "users_can_view_order_items" ON order_items
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM orders 
                WHERE orders.id = order_items.order_id 
                AND (orders.seller_id = auth.uid() OR orders.buyer_id = auth.uid())
            ) OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );

    -- Los compradores pueden insertar items en sus órdenes
    DROP POLICY IF EXISTS "buyers_can_create_order_items" ON order_items;
    CREATE POLICY "buyers_can_create_order_items" ON order_items
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM orders 
                WHERE orders.id = order_items.order_id 
                AND orders.buyer_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'vendedor')
            )
        );

    RAISE NOTICE 'Políticas RLS configuradas para order_items';
END $$;

-- 9. Verificar datos de prueba y estructura
SELECT 
    'orders' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT seller_id) as unique_sellers,
    COUNT(DISTINCT buyer_id) as unique_buyers
FROM orders

UNION ALL

SELECT 
    'order_items' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT order_id) as unique_orders,
    COUNT(DISTINCT product_id) as unique_products
FROM order_items;

-- 10. Mostrar estructura final de la tabla orders
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE 'Script de verificación y corrección completado exitosamente';
END $$;
