-- =====================================================
-- 🔧 SOLUCIÓN URGENTE: TRIGGER PARA PRODUCTOS DEL DÍA
-- =====================================================
-- Ejecutar este script para que el stock de productos del día se descuente automáticamente

-- 🗑️ PASO 1: Eliminar trigger anterior que no manejaba productos del día
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_accepted ON public.orders;
DROP FUNCTION IF EXISTS public.process_order_stock CASCADE;

-- ✅ PASO 2: Crear nueva función que maneja AMBOS tipos de productos
CREATE OR REPLACE FUNCTION public.process_order_stock()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
    table_name TEXT;
    product_found BOOLEAN;
BEGIN
    -- Se activa cuando cambia a 'accepted' (vendedor acepta la orden)
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        
        RAISE NOTICE '🔄 Procesando descuento de stock para orden: %', NEW.id;
        
        -- Obtener todos los items de esta orden con su tipo
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
            
            -- Determinar la tabla según el tipo de producto
            IF item_record.product_type = 'daily' THEN
                table_name := 'daily_products';
                
                -- Buscar en daily_products
                SELECT stock_quantity INTO current_stock
                FROM public.daily_products 
                WHERE id = item_record.product_id;
                
                IF current_stock IS NOT NULL THEN
                    product_found := TRUE;
                    RAISE NOTICE '📦 PRODUCTO DEL DÍA: % - Stock actual: %', item_record.product_name, current_stock;
                END IF;
                
            ELSE
                table_name := 'products';
                
                -- Buscar en products (productos regulares)
                SELECT stock_quantity INTO current_stock
                FROM public.products 
                WHERE id = item_record.product_id;
                
                IF current_stock IS NOT NULL THEN
                    product_found := TRUE;
                    RAISE NOTICE '📦 PRODUCTO REGULAR: % - Stock actual: %', item_record.product_name, current_stock;
                END IF;
            END IF;
            
            -- Si encontramos el producto, actualizar stock
            IF product_found THEN
                -- Calcular nuevo stock
                new_stock := current_stock - item_record.quantity;
                
                RAISE NOTICE '📊 %: %  - %  = % (tabla: %)', 
                    item_record.product_name, current_stock, item_record.quantity, new_stock, table_name;
                
                -- Actualizar stock en la tabla correspondiente
                IF item_record.product_type = 'daily' THEN
                    UPDATE public.daily_products 
                    SET stock_quantity = new_stock,
                        updated_at = NOW()
                    WHERE id = item_record.product_id;
                    
                    RAISE NOTICE '✅ Stock actualizado en daily_products para: %', item_record.product_name;
                ELSE
                    UPDATE public.products 
                    SET stock_quantity = new_stock,
                        updated_at = NOW()
                    WHERE id = item_record.product_id;
                    
                    RAISE NOTICE '✅ Stock actualizado en products para: %', item_record.product_name;
                END IF;
                
            ELSE
                RAISE WARNING '⚠️ Producto % no encontrado en tabla %', item_record.product_name, table_name;
            END IF;
            
        END LOOP;
        
        RAISE NOTICE '🎉 Descuento de stock completado para orden: %', NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PASO 3: Crear nuevo trigger
CREATE TRIGGER trigger_update_stock_on_order_accepted
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_order_stock();

-- 🔐 PASO 4: Otorgar permisos
GRANT EXECUTE ON FUNCTION public.process_order_stock() TO authenticated;

-- 🧪 PASO 5: Verificación del trigger
SELECT 
    'TRIGGER CREADO:' as info,
    trigger_name, 
    event_manipulation, 
    event_object_table,
    'ACTIVO' as estado
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_stock_on_order_accepted';

-- 📊 PASO 6: Mostrar productos del día actuales para testing
SELECT 
    '🔥 PRODUCTOS DEL DÍA DISPONIBLES:' as info,
    id,
    name,
    stock_quantity,
    expires_at,
    CASE 
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        WHEN expires_at <= NOW() THEN '❌ EXPIRADO' 
        ELSE '✅ DISPONIBLE'
    END as estado
FROM public.daily_products 
ORDER BY expires_at;

-- 📋 PASO 7: Mostrar productos regulares para comparación
SELECT 
    '📦 PRODUCTOS REGULARES:' as info,
    id,
    name,
    stock_quantity,
    CASE 
        WHEN stock_quantity <= 0 THEN '❌ SIN STOCK'
        ELSE '✅ DISPONIBLE'
    END as estado
FROM public.products 
WHERE stock_quantity IS NOT NULL
ORDER BY name
LIMIT 5;

-- ✅ RESULTADO
SELECT '🎯 TRIGGER ACTUALIZADO - AHORA MANEJA PRODUCTOS DEL DÍA Y REGULARES' as resultado;

-- 💡 INSTRUCCIONES PARA PROBAR:
-- 1. Hacer una compra de un producto del día
-- 2. Como vendedor, aceptar la orden (cambiar status a 'accepted')
-- 3. Verificar que el stock se descontó en daily_products
-- 4. Revisar los logs en Supabase -> Logs para ver los RAISE NOTICE
