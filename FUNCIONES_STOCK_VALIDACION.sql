-- =====================================================
-- 🛡️ VALIDACIÓN DE STOCK ANTES DE COMPRA
-- =====================================================
-- Función para validar que hay suficiente stock antes de confirmar una orden

CREATE OR REPLACE FUNCTION public.validate_order_stock(
    p_order_id UUID
)
RETURNS TABLE (
    is_valid BOOLEAN,
    message TEXT,
    product_issues JSONB
) AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    issues JSONB := '[]'::JSONB;
    total_issues INTEGER := 0;
    issue_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
    
    -- Verificar cada producto en la orden
    FOR item_record IN 
        SELECT 
            oi.product_id,
            oi.quantity,
            oi.product_name,
            p.stock_quantity,
            p.name as actual_product_name
        FROM public.order_items oi
        LEFT JOIN public.products p ON oi.product_id = p.id
        WHERE oi.order_id = p_order_id
    LOOP
        current_stock := COALESCE(item_record.stock_quantity, 0);
        
        -- Verificar si hay suficiente stock
        IF current_stock < item_record.quantity THEN
            total_issues := total_issues + 1;
            
            -- Agregar a la lista de problemas
            issues := issues || jsonb_build_object(
                'product_id', item_record.product_id,
                'product_name', COALESCE(item_record.actual_product_name, item_record.product_name),
                'requested_quantity', item_record.quantity,
                'available_stock', current_stock,
                'shortage', item_record.quantity - current_stock
            );
            
            -- Construir mensaje de error
            IF current_stock = 0 THEN
                issue_messages := issue_messages || format(
                    '❌ %s: AGOTADO (solicitado: %s)',
                    COALESCE(item_record.actual_product_name, item_record.product_name),
                    item_record.quantity
                );
            ELSE
                issue_messages := issue_messages || format(
                    '⚠️ %s: Solo quedan %s unidades (solicitado: %s)',
                    COALESCE(item_record.actual_product_name, item_record.product_name),
                    current_stock,
                    item_record.quantity
                );
            END IF;
        END IF;
        
    END LOOP;
    
    -- Retornar resultado
    IF total_issues = 0 THEN
        RETURN QUERY SELECT 
            true as is_valid,
            '✅ Stock suficiente para todos los productos'::TEXT as message,
            '[]'::JSONB as product_issues;
    ELSE
        RETURN QUERY SELECT 
            false as is_valid,
            format('❌ %s producto(s) con problemas de stock: %s', 
                total_issues, 
                array_to_string(issue_messages, '; ')
            )::TEXT as message,
            issues as product_issues;
    END IF;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 🔧 FUNCIÓN PARA AJUSTAR STOCK MANUALMENTE
-- =====================================================
-- Para que el vendedor pueda corregir stock cuando sea necesario

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_product_id UUID,
    p_new_stock_quantity INTEGER,
    p_reason TEXT DEFAULT 'Ajuste manual'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    old_stock INTEGER,
    new_stock INTEGER
) AS $$
DECLARE
    old_quantity INTEGER;
    product_name_var TEXT;
BEGIN
    -- Obtener información actual del producto
    SELECT stock_quantity, name INTO old_quantity, product_name_var
    FROM public.products 
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false,
            'Producto no encontrado'::TEXT,
            0,
            0;
        RETURN;
    END IF;
    
    -- Validar nueva cantidad
    IF p_new_stock_quantity < 0 THEN
        RETURN QUERY SELECT 
            false,
            'La cantidad no puede ser negativa'::TEXT,
            old_quantity,
            p_new_stock_quantity;
        RETURN;
    END IF;
    
    -- Actualizar stock
    UPDATE public.products 
    SET stock_quantity = p_new_stock_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
    
    -- Log del cambio (opcional - se puede agregar tabla de logs más tarde)
    RAISE NOTICE 'STOCK AJUSTADO: % | %: % → % | Razón: %', 
        p_product_id, product_name_var, old_quantity, p_new_stock_quantity, p_reason;
    
    RETURN QUERY SELECT 
        true,
        format('Stock de "%s" actualizado de %s a %s unidades', 
            product_name_var, old_quantity, p_new_stock_quantity)::TEXT,
        old_quantity,
        p_new_stock_quantity;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 🔍 FUNCIÓN DE REPORTE DE STOCK
-- =====================================================
-- Para mostrar estado actual de inventario

CREATE OR REPLACE FUNCTION public.get_stock_report(
    p_seller_id UUID DEFAULT NULL
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    current_stock INTEGER,
    stock_status TEXT,
    total_sold INTEGER,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.stock_quantity as current_stock,
        CASE 
            WHEN p.stock_quantity < 0 THEN '❌ STOCK NEGATIVO'
            WHEN p.stock_quantity = 0 THEN '⚠️ AGOTADO'
            WHEN p.stock_quantity <= 5 THEN '🟡 STOCK BAJO'
            ELSE '✅ STOCK NORMAL'
        END as stock_status,
        COALESCE(sold_summary.total_sold, 0) as total_sold,
        p.updated_at as last_updated
    FROM public.products p
    LEFT JOIN (
        SELECT 
            oi.product_id,
            SUM(oi.quantity) as total_sold
        FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE o.status IN ('confirmed', 'preparing', 'ready', 'in_transit', 'delivered')
        GROUP BY oi.product_id
    ) sold_summary ON p.id = sold_summary.product_id
    WHERE (p_seller_id IS NULL OR p.seller_id = p_seller_id)
    ORDER BY 
        CASE 
            WHEN p.stock_quantity < 0 THEN 1
            WHEN p.stock_quantity = 0 THEN 2
            WHEN p.stock_quantity <= 5 THEN 3
            ELSE 4
        END,
        p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ OTORGAR PERMISOS
GRANT EXECUTE ON FUNCTION public.validate_order_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_report(UUID) TO authenticated;

SELECT '✅ FUNCIONES DE VALIDACIÓN Y GESTIÓN DE STOCK CREADAS' as resultado;
