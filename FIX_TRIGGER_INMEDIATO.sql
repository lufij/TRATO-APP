-- =====================================================
-- 🚨 FIX INMEDIATO - TRIGGER STOCK PRODUCTOS DEL DÍA
-- =====================================================

-- 1. AGREGAR COLUMNA FALTANTE
ALTER TABLE daily_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. RECREAR TRIGGER CORREGIDO
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_accepted ON public.orders;
DROP FUNCTION IF EXISTS public.process_order_stock CASCADE;

-- 3. FUNCIÓN CORREGIDA
CREATE OR REPLACE FUNCTION public.process_order_stock()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Solo se activa cuando cambia a 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        -- Procesar cada item de la orden
        FOR item_record IN 
            SELECT 
                product_id, 
                quantity,
                product_type,
                product_name
            FROM order_items 
            WHERE order_id = NEW.id
        LOOP
            -- Si es producto del día, actualizar daily_products
            IF item_record.product_type = 'daily' THEN
                -- Obtener stock actual
                SELECT stock_quantity INTO current_stock
                FROM daily_products
                WHERE id = item_record.product_id;
                
                IF FOUND THEN
                    -- Calcular nuevo stock
                    new_stock := GREATEST(0, current_stock - item_record.quantity);
                    
                    -- Actualizar stock
                    UPDATE daily_products 
                    SET stock_quantity = new_stock
                    WHERE id = item_record.product_id;
                    
                    RAISE NOTICE 'Stock actualizado - Producto: %, Stock: % → %', 
                        item_record.product_name, current_stock, new_stock;
                END IF;
                
            -- Si es producto regular, actualizar products
            ELSIF item_record.product_type = 'regular' OR item_record.product_type IS NULL THEN
                -- Obtener stock actual
                SELECT stock_quantity INTO current_stock
                FROM products
                WHERE id = item_record.product_id;
                
                IF FOUND THEN
                    -- Calcular nuevo stock
                    new_stock := GREATEST(0, current_stock - item_record.quantity);
                    
                    -- Actualizar stock
                    UPDATE products 
                    SET stock_quantity = new_stock,
                        updated_at = NOW()
                    WHERE id = item_record.product_id;
                    
                    RAISE NOTICE 'Stock actualizado - Producto: %, Stock: % → %', 
                        item_record.product_name, current_stock, new_stock;
                END IF;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Procesamiento de stock completado para orden: %', NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error en trigger de stock: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RECREAR TRIGGER
CREATE TRIGGER trigger_update_stock_on_order_accepted
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_order_stock();

-- 5. VERIFICACIÓN
SELECT 'TRIGGER RECREADO EXITOSAMENTE' as resultado;
