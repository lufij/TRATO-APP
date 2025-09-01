-- =====================================================
-- 🔧 SOLUCIÓN DEFINITIVA: TRIGGER PRODUCTOS DEL DÍA
-- =====================================================
-- Este script reemplaza TODOS los triggers anteriores

-- 🗑️ PASO 1: Limpiar TODOS los triggers existentes
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_accepted ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_confirm ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_stock_on_delivery ON public.orders;
DROP FUNCTION IF EXISTS public.process_order_stock CASCADE;
DROP FUNCTION IF EXISTS public.update_stock_on_delivery CASCADE;

-- ✅ PASO 2: Crear función DEFINITIVA que maneja AMBOS tipos
CREATE OR REPLACE FUNCTION public.process_order_stock()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
    target_table TEXT;
    product_found BOOLEAN;
BEGIN
    -- Se activa cuando cambia a 'accepted'
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        RAISE NOTICE '🔄 ORDEN ACEPTADA - Procesando descuento de stock: %', NEW.id;
        
        -- Obtener items con su tipo
        FOR item_record IN 
            SELECT 
                product_id, 
                quantity, 
                product_name, 
                COALESCE(product_type, 'regular') as product_type
            FROM public.order_items 
            WHERE order_id = NEW.id AND product_id IS NOT NULL
        LOOP
            current_stock := NULL;
            product_found := FALSE;
            
            -- Determinar tabla según tipo
            IF item_record.product_type = 'daily' THEN
                target_table := 'daily_products';
                
                -- Buscar en daily_products
                SELECT stock_quantity INTO current_stock
                FROM public.daily_products 
                WHERE id = item_record.product_id;
                
                IF current_stock IS NOT NULL THEN
                    product_found := TRUE;
                    RAISE NOTICE '🔥 PRODUCTO DEL DÍA: % | Stock: %', item_record.product_name, current_stock;
                END IF;
                
            ELSE
                target_table := 'products';
                
                -- Buscar en products
                SELECT stock_quantity INTO current_stock
                FROM public.products 
                WHERE id = item_record.product_id;
                
                IF current_stock IS NOT NULL THEN
                    product_found := TRUE;
                    RAISE NOTICE '📦 PRODUCTO REGULAR: % | Stock: %', item_record.product_name, current_stock;
                END IF;
            END IF;
            
            -- Actualizar stock si encontramos el producto
            IF product_found THEN
                new_stock := current_stock - item_record.quantity;
                
                RAISE NOTICE '📊 DESCUENTO: % - % = % (tabla: %)', 
                    current_stock, item_record.quantity, new_stock, target_table;
                
                -- Actualizar en la tabla correspondiente
                IF item_record.product_type = 'daily' THEN
                    UPDATE public.daily_products 
                    SET stock_quantity = new_stock,
                        updated_at = NOW()
                    WHERE id = item_record.product_id;
                    
                    RAISE NOTICE '✅ STOCK ACTUALIZADO EN DAILY_PRODUCTS: %', item_record.product_name;
                ELSE
                    UPDATE public.products 
                    SET stock_quantity = new_stock,
                        updated_at = NOW()
                    WHERE id = item_record.product_id;
                    
                    RAISE NOTICE '✅ STOCK ACTUALIZADO EN PRODUCTS: %', item_record.product_name;
                END IF;
                
            ELSE
                RAISE WARNING '❌ PRODUCTO NO ENCONTRADO: % en tabla %', item_record.product_name, target_table;
            END IF;
            
        END LOOP;
        
        RAISE NOTICE '🎉 DESCUENTO COMPLETADO PARA ORDEN: %', NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PASO 3: Crear trigger único
CREATE TRIGGER trigger_update_stock_on_order_accepted
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_order_stock();

-- 🔐 PASO 4: Permisos
GRANT EXECUTE ON FUNCTION public.process_order_stock() TO authenticated;

-- 🧪 PASO 5: Verificación
SELECT '✅ TRIGGER DEFINITIVO CREADO' as resultado;

-- Mostrar trigger activo
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_order_accepted';

-- 📋 INSTRUCCIONES FINALES:
-- 1. Haz una compra de producto del día
-- 2. Como vendedor, acepta la orden
-- 3. Revisa los logs en Supabase → Logs
-- 4. Verifica que el stock se descontó en daily_products
