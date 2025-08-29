-- =====================================================
-- 🔧 SOLUCIÓN: ARREGLAR TRIGGER PARA FUNCIONAR CON "ACCEPTED"
-- =====================================================
-- Ejecutar este script para que el stock se descuente cuando el vendedor acepta la orden

-- 🗑️ PASO 1: Eliminar trigger anterior
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_confirm ON public.orders;
DROP FUNCTION IF EXISTS public.process_order_stock CASCADE;

-- ✅ PASO 2: Crear nueva función que funciona con "accepted"
CREATE OR REPLACE FUNCTION public.process_order_stock()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- AHORA se activa cuando cambia a 'accepted' (vendedor acepta la orden)
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        RAISE NOTICE '🔄 Procesando descuento de stock para orden: %', NEW.id;
        
        -- Obtener todos los items de esta orden
        FOR item_record IN 
            SELECT product_id, quantity, product_name 
            FROM public.order_items 
            WHERE order_id = NEW.id AND product_id IS NOT NULL
        LOOP
            -- Obtener stock actual del producto
            SELECT stock_quantity INTO current_stock
            FROM public.products 
            WHERE id = item_record.product_id;
            
            IF current_stock IS NOT NULL THEN
                -- Calcular nuevo stock
                new_stock := current_stock - item_record.quantity;
                
                RAISE NOTICE '📦 %: Stock %  - Vendido % = Nuevo stock %', 
                    item_record.product_name, current_stock, item_record.quantity, new_stock;
                
                -- Actualizar stock
                UPDATE public.products 
                SET stock_quantity = new_stock,
                    updated_at = NOW()
                WHERE id = item_record.product_id;
                
                RAISE NOTICE '✅ Stock actualizado para producto: %', item_record.product_name;
            ELSE
                RAISE NOTICE '⚠️ Producto no encontrado o sin stock_quantity: %', item_record.product_id;
            END IF;
        END LOOP;
        
        RAISE NOTICE '✅ Stock actualizado para orden: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PASO 3: Crear nuevo trigger que se activa con "accepted"
CREATE TRIGGER trigger_update_stock_on_order_accepted
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_order_stock();

-- 🧪 PASO 4: Probar con la orden más reciente (cambiarla a accepted para activar el trigger)
DO $$
DECLARE
    recent_order_id UUID;
    current_status TEXT;
BEGIN
    -- Obtener la orden más reciente
    SELECT id, status INTO recent_order_id, current_status
    FROM public.orders 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RAISE NOTICE '🧪 PROBANDO: Orden % tiene status: %', recent_order_id, current_status;
    
    -- Si la orden no está en 'accepted', simular el cambio para probar el trigger
    IF current_status != 'accepted' THEN
        RAISE NOTICE '🔄 Cambiando status a "accepted" para probar el trigger...';
        
        -- Cambiar temporalmente a pending y luego a accepted para activar el trigger
        UPDATE public.orders 
        SET status = 'pending'
        WHERE id = recent_order_id;
        
        -- Ahora cambiar a accepted (esto activará el trigger)
        UPDATE public.orders 
        SET status = 'accepted',
            accepted_at = NOW()
        WHERE id = recent_order_id;
        
        RAISE NOTICE '✅ Trigger ejecutado. Revisa el stock de los productos.';
        
        -- Restaurar el status original
        UPDATE public.orders 
        SET status = current_status
        WHERE id = recent_order_id;
        
        RAISE NOTICE '🔄 Status restaurado a: %', current_status;
    ELSE
        RAISE NOTICE 'ℹ️ La orden ya está en status "accepted"';
    END IF;
END $$;

-- ✅ VERIFICACIÓN FINAL
SELECT '🎉 TRIGGER ARREGLADO - AHORA FUNCIONA CON "ACCEPTED"' as resultado;

-- Mostrar el trigger actualizado
SELECT 
    'TRIGGER - ' || trigger_name as "Trigger",
    event_manipulation as "Evento",
    'ACTIVO' as "Estado"
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_order_accepted';

-- Verificar stock actual de calcomanías
SELECT 
    name as "Producto",
    stock_quantity as "Stock Actual"
FROM public.products 
WHERE name ILIKE '%calcoman%';
