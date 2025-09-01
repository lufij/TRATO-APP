-- =====================================================
-- 🚨 SOLUCIÓN DEFINITIVA - SIN UPDATED_AT EN DAILY_PRODUCTS
-- =====================================================

-- 1. LIMPIAR TRIGGERS EXISTENTES
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_accepted ON public.orders;
DROP FUNCTION IF EXISTS public.process_order_stock CASCADE;

-- 2. FUNCIÓN TRIGGER CORREGIDA (SIN UPDATED_AT)
CREATE OR REPLACE FUNCTION public.process_order_stock()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Solo cuando cambia a 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        -- Procesar cada item
        FOR item_record IN 
            SELECT product_id, quantity, product_type, product_name
            FROM order_items 
            WHERE order_id = NEW.id
        LOOP
            -- PRODUCTOS DEL DÍA
            IF item_record.product_type = 'daily' THEN
                SELECT stock_quantity INTO current_stock
                FROM daily_products WHERE id = item_record.product_id;
                
                IF FOUND THEN
                    new_stock := GREATEST(0, current_stock - item_record.quantity);
                    UPDATE daily_products 
                    SET stock_quantity = new_stock
                    WHERE id = item_record.product_id;
                END IF;
                
            -- PRODUCTOS REGULARES
            ELSE
                SELECT stock_quantity INTO current_stock
                FROM products WHERE id = item_record.product_id;
                
                IF FOUND THEN
                    new_stock := GREATEST(0, current_stock - item_record.quantity);
                    UPDATE products 
                    SET stock_quantity = new_stock, updated_at = NOW()
                    WHERE id = item_record.product_id;
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CREAR TRIGGER
CREATE TRIGGER trigger_update_stock_on_order_accepted
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_order_stock();

-- ✅ LISTO
