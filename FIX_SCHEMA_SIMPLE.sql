-- Script simplificado para verificar y corregir el esquema de órdenes
-- Versión sin errores de sintaxis

-- 1. Agregar columnas faltantes a la tabla orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Crear tabla order_items si no existe
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Agregar columnas faltantes a order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 4. Crear función para sincronizar totales
CREATE OR REPLACE FUNCTION sync_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders 
    SET 
        total_amount = (
            SELECT COALESCE(SUM(subtotal), 0) 
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        total = (
            SELECT COALESCE(SUM(subtotal), 0) 
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para sincronización
DROP TRIGGER IF EXISTS sync_order_totals_trigger ON order_items;
CREATE TRIGGER sync_order_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_totals();

-- 6. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 7. Habilitar RLS en orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 8. Política para vendedores ver sus órdenes
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

-- 9. Política para crear órdenes
DROP POLICY IF EXISTS "buyers_can_create_orders" ON orders;
CREATE POLICY "buyers_can_create_orders" ON orders
    FOR INSERT WITH CHECK (
        auth.uid() = buyer_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'vendedor')
        )
    );

-- 10. Política para actualizar órdenes
DROP POLICY IF EXISTS "sellers_can_update_own_orders" ON orders;
CREATE POLICY "sellers_can_update_own_orders" ON orders
    FOR UPDATE USING (
        auth.uid() = seller_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 11. Habilitar RLS en order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 12. Política para ver order_items
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

-- 13. Política para crear order_items
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

-- 14. Sincronizar totales existentes
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

-- 15. Verificar estructura final
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
