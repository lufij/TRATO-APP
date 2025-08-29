-- =====================================================
-- TRIGGER PARA ACTUALIZACIÓN AUTOMÁTICA DE STOCK
-- =====================================================
-- Este trigger se ejecuta cuando una orden cambia a estado 'delivered'
-- para actualizar automáticamente el stock de los productos

-- =====================================================
-- 1. FUNCIÓN PARA ACTUALIZAR STOCK CUANDO SE ENTREGA
-- =====================================================

CREATE OR REPLACE FUNCTION update_stock_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
    table_name TEXT;
BEGIN
    -- Solo ejecutar cuando el estado cambia a 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        
        RAISE NOTICE '📦 Orden % marcada como entregada. Actualizando stock...', NEW.id;
        
        -- Procesar cada item de la orden
        FOR order_item IN 
            SELECT oi.product_id, oi.quantity, oi.product_name, oi.product_type
            FROM order_items oi 
            WHERE oi.order_id = NEW.id
        LOOP
            -- Determinar la tabla según el tipo de producto
            IF order_item.product_type = 'daily' THEN
                table_name := 'daily_products';
            ELSE
                table_name := 'products';
            END IF;
            
            RAISE NOTICE '  - Procesando %: % unidades de % (tabla: %)', 
                         order_item.product_name, order_item.quantity, order_item.product_id, table_name;
            
            -- Obtener stock actual
            IF table_name = 'daily_products' THEN
                SELECT stock_quantity INTO current_stock 
                FROM daily_products 
                WHERE id = order_item.product_id;
            ELSE
                SELECT stock_quantity INTO current_stock 
                FROM products 
                WHERE id = order_item.product_id;
            END IF;
            
            -- Verificar si el producto existe
            IF current_stock IS NULL THEN
                RAISE WARNING '⚠️ Producto % no encontrado en tabla %', order_item.product_id, table_name;
                CONTINUE;
            END IF;
            
            -- Calcular nuevo stock
            new_stock := current_stock - order_item.quantity;
            
            -- Asegurar que el stock no sea negativo
            IF new_stock < 0 THEN
                new_stock := 0;
                RAISE WARNING '⚠️ Stock negativo ajustado a 0 para producto %', order_item.product_name;
            END IF;
            
            RAISE NOTICE '    Stock: % → % (vendido: %)', current_stock, new_stock, order_item.quantity;
            
            -- Actualizar el stock en la tabla correspondiente
            IF table_name = 'daily_products' THEN
                UPDATE daily_products 
                SET stock_quantity = new_stock, 
                    updated_at = NOW()
                WHERE id = order_item.product_id;
            ELSE
                UPDATE products 
                SET stock_quantity = new_stock, 
                    is_available = CASE WHEN new_stock > 0 THEN is_available ELSE false END,
                    updated_at = NOW()
                WHERE id = order_item.product_id;
            END IF;
            
            RAISE NOTICE '  ✅ Stock actualizado para %', order_item.product_name;
            
        END LOOP;
        
        RAISE NOTICE '🎉 Stock actualizado exitosamente para orden %', NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREAR EL TRIGGER
-- =====================================================

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_update_stock_on_delivery ON orders;

-- Crear el trigger
CREATE TRIGGER trigger_update_stock_on_delivery
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_delivery();

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

-- Verificar que el trigger fue creado
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_delivery';

-- Verificar productos del día disponibles para testing
SELECT 
    'PRODUCTOS DEL DÍA PARA TESTING:' as info,
    id,
    name,
    stock_quantity,
    expires_at
FROM daily_products 
WHERE stock_quantity > 0 
  AND expires_at > NOW()
ORDER BY name;

RAISE NOTICE '✅ Sistema de actualización automática de stock configurado';
RAISE NOTICE '🔥 Cuando una orden se marque como "delivered", el stock se actualizará automáticamente';
RAISE NOTICE '📋 Productos del día disponibles para testing listados arriba';
