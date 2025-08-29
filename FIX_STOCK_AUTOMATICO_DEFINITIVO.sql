-- =====================================================
-- 🛒 FIX DEFINITIVO: DESCUENTO AUTOMÁTICO DE STOCK
-- =====================================================
-- Ejecutar en Supabase SQL Editor

-- 🗑️ PASO 1: Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.update_product_stock CASCADE;
DROP FUNCTION IF EXISTS public.process_order_stock CASCADE;

-- ✅ PASO 2: Crear función para descontar stock automáticamente
CREATE OR REPLACE FUNCTION public.process_order_stock()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Solo procesar cuando una orden cambia a 'confirmed' (vendedor confirma)
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        
        RAISE NOTICE '🔄 Procesando descuento de stock para orden: %', NEW.id;
        
        -- Obtener todos los items de esta orden
        FOR item_record IN 
            SELECT product_id, quantity, product_name 
            FROM public.order_items 
            WHERE order_id = NEW.id
        LOOP
            -- Obtener stock actual del producto
            SELECT stock_quantity INTO current_stock
            FROM public.products 
            WHERE id = item_record.product_id;
            
            IF current_stock IS NULL THEN
                RAISE NOTICE '⚠️ Producto no encontrado: %', item_record.product_id;
                CONTINUE;
            END IF;
            
            -- Calcular nuevo stock
            new_stock := current_stock - item_record.quantity;
            
            RAISE NOTICE '📦 Producto: % | Stock actual: % | Vendido: % | Nuevo stock: %', 
                item_record.product_name, current_stock, item_record.quantity, new_stock;
            
            -- Actualizar stock (permitir stock negativo para detectar overselling)
            UPDATE public.products 
            SET stock_quantity = new_stock,
                updated_at = NOW()
            WHERE id = item_record.product_id;
            
            -- Log para debugging
            IF new_stock < 0 THEN
                RAISE NOTICE '⚠️ ADVERTENCIA: Stock negativo detectado para %: %', item_record.product_name, new_stock;
            END IF;
            
        END LOOP;
        
        RAISE NOTICE '✅ Stock actualizado exitosamente para orden: %', NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PASO 3: Crear trigger que se ejecute cuando cambie el status de una orden
DROP TRIGGER IF EXISTS trigger_update_stock_on_order_confirm ON public.orders;

CREATE TRIGGER trigger_update_stock_on_order_confirm
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_order_stock();

-- ✅ PASO 4: Función para corregir stock histórico oversold
CREATE OR REPLACE FUNCTION public.fix_oversold_products()
RETURNS TABLE (
    product_name TEXT,
    current_stock INTEGER,
    total_sold INTEGER,
    correct_stock INTEGER,
    action_taken TEXT
) AS $$
DECLARE
    product_record RECORD;
    sold_quantity INTEGER;
    correct_stock_value INTEGER;
BEGIN
    -- Buscar productos con posible overselling
    FOR product_record IN 
        SELECT p.id, p.name, p.stock_quantity, p.seller_id
        FROM public.products p
        ORDER BY p.name
    LOOP
        -- Calcular total vendido (solo órdenes confirmadas)
        SELECT COALESCE(SUM(oi.quantity), 0) INTO sold_quantity
        FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE oi.product_id = product_record.id 
        AND o.status IN ('confirmed', 'preparing', 'ready', 'in_transit', 'delivered');
        
        -- Determinar stock correcto
        -- Si no hay ventas, mantener stock actual
        -- Si hay ventas pero stock actual es muy bajo, puede ser overselling
        IF sold_quantity > 0 AND product_record.stock_quantity < 0 THEN
            -- Producto con stock negativo = overselling detectado
            correct_stock_value := 0; -- Resetear a 0 para evitar problemas
            
            UPDATE public.products 
            SET stock_quantity = correct_stock_value,
                updated_at = NOW()
            WHERE id = product_record.id;
            
            RETURN QUERY SELECT 
                product_record.name,
                product_record.stock_quantity,
                sold_quantity,
                correct_stock_value,
                'CORREGIDO: Stock negativo reseteado a 0'::TEXT;
                
        ELSE
            -- Producto normal, solo reportar
            RETURN QUERY SELECT 
                product_record.name,
                product_record.stock_quantity,
                sold_quantity,
                product_record.stock_quantity,
                'OK: Stock normal'::TEXT;
        END IF;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ PASO 5: Ejecutar corrección de productos oversold
SELECT 'EJECUTANDO CORRECCIÓN DE PRODUCTOS OVERSOLD:' as status;
SELECT * FROM public.fix_oversold_products();

-- ✅ PASO 6: Otorgar permisos
GRANT EXECUTE ON FUNCTION public.process_order_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_oversold_products() TO authenticated;

-- ✅ PASO 7: Verificación final
SELECT 'VERIFICACIÓN FINAL:' as status;

-- Mostrar productos con stock actual
SELECT 
    name as "Producto",
    stock_quantity as "Stock Actual",
    CASE 
        WHEN stock_quantity < 0 THEN '❌ STOCK NEGATIVO'
        WHEN stock_quantity = 0 THEN '⚠️ SIN STOCK'
        WHEN stock_quantity <= 5 THEN '🟡 STOCK BAJO'
        ELSE '✅ STOCK NORMAL'
    END as "Estado"
FROM public.products 
ORDER BY stock_quantity ASC, name;

SELECT '✅ SISTEMA DE DESCUENTO AUTOMÁTICO DE STOCK INSTALADO CORRECTAMENTE' as resultado;
