-- =====================================================
-- 🔄 CORRECCIÓN DE STOCK HISTÓRICO - PRODUCTOS DEL DÍA
-- =====================================================
-- Este script corrige el stock actual basándose en ventas históricas

DO $$
DECLARE
    producto_record RECORD;
    venta_record RECORD;
    total_vendido INTEGER;
    stock_correcto INTEGER;
BEGIN
    RAISE NOTICE '🔍 CORRIGIENDO STOCK HISTÓRICO DE PRODUCTOS DEL DÍA...';
    RAISE NOTICE '================================================';
    
    -- Recorrer cada producto del día
    FOR producto_record IN 
        SELECT id, name, stock_quantity, seller_id
        FROM public.daily_products 
        WHERE expires_at > NOW() - INTERVAL '7 days' -- Productos de última semana
    LOOP
        -- Calcular total vendido de este producto
        SELECT COALESCE(SUM(oi.quantity), 0) INTO total_vendido
        FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE (
            -- Buscar por daily_product_id (correcto)
            oi.daily_product_id = producto_record.id
            OR 
            -- O por product_id si daily_product_id es null (fallback)
            (oi.product_id = producto_record.id AND oi.product_type = 'daily')
            OR
            -- O por nombre si los IDs no coinciden (último recurso)
            (oi.product_name = producto_record.name AND oi.product_type = 'daily')
        )
        AND o.status IN ('accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed');
        
        RAISE NOTICE '';
        RAISE NOTICE '📦 Producto: %', producto_record.name;
        RAISE NOTICE '   Stock actual: %', producto_record.stock_quantity;
        RAISE NOTICE '   Total vendido: %', total_vendido;
        
        -- Si hay ventas, el stock debería haberse descontado
        IF total_vendido > 0 THEN
            -- Mostrar información detallada de las ventas
            RAISE NOTICE '   📋 Ventas encontradas:';
            
            FOR venta_record IN 
                SELECT o.id, o.status, o.created_at, oi.quantity, oi.product_name
                FROM public.order_items oi
                JOIN public.orders o ON oi.order_id = o.id
                WHERE (
                    oi.daily_product_id = producto_record.id
                    OR (oi.product_id = producto_record.id AND oi.product_type = 'daily')
                    OR (oi.product_name = producto_record.name AND oi.product_type = 'daily')
                )
                AND o.status IN ('accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed')
                ORDER BY o.created_at DESC
            LOOP
                RAISE NOTICE '      - Orden %: % unidades (%)', 
                    venta_record.id, venta_record.quantity, venta_record.status;
            END LOOP;
            
            -- ⚠️ PREGUNTA CRÍTICA: ¿Cuál era el stock original?
            -- Asumir que el stock original era: stock_actual + total_vendido
            -- (Esto significa que las ventas NO se descontaron previamente)
            
            RAISE NOTICE '   🧮 CÁLCULO:';
            RAISE NOTICE '      Stock original estimado: %', producto_record.stock_quantity + total_vendido;
            RAISE NOTICE '      Menos total vendido: -%', total_vendido;
            RAISE NOTICE '      Stock correcto debería ser: %', producto_record.stock_quantity;
            
            -- Si el stock actual parece no haber sido descontado, corregir
            IF producto_record.stock_quantity > 0 THEN
                stock_correcto := producto_record.stock_quantity - total_vendido;
                
                -- Evitar stock negativo
                IF stock_correcto < 0 THEN
                    stock_correcto := 0;
                    RAISE NOTICE '   ⚠️ Stock ajustado a 0 (evitar negativo)';
                END IF;
                
                RAISE NOTICE '   🔄 ACTUALIZANDO: % → %', producto_record.stock_quantity, stock_correcto;
                
                -- Actualizar el stock
                UPDATE public.daily_products 
                SET stock_quantity = stock_correcto,
                    updated_at = NOW()
                WHERE id = producto_record.id;
                
                RAISE NOTICE '   ✅ Stock corregido exitosamente';
            ELSE
                RAISE NOTICE '   ℹ️ Stock ya está en 0, no necesita corrección';
            END IF;
        ELSE
            RAISE NOTICE '   ℹ️ No hay ventas registradas, stock correcto';
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 CORRECCIÓN DE STOCK HISTÓRICO COMPLETADA';
    RAISE NOTICE '📊 RESUMEN DESPUÉS DE LA CORRECCIÓN:';
END $$;

-- Mostrar estado final
SELECT 
    'ESTADO FINAL DE PRODUCTOS DEL DÍA:' as info,
    id,
    name,
    stock_quantity,
    expires_at
FROM public.daily_products 
WHERE expires_at > NOW() - INTERVAL '7 days'
ORDER BY name;
