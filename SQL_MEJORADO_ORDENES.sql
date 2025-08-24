-- SQL MEJORADO para corregir el trigger de sincronización de totales
-- Este script corrige los errores de sintaxis y manejo de casos NULL

-- 1. Primero, eliminar el trigger problemático
DROP TRIGGER IF EXISTS sync_order_totals_trigger ON order_items;

-- 2. Crear una función mejorada que maneje correctamente todos los casos
CREATE OR REPLACE FUNCTION sync_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_order_id UUID;
BEGIN
    -- Determinar el order_id correcto según el tipo de operación
    IF TG_OP = 'DELETE' THEN
        target_order_id := OLD.order_id;
    ELSE
        target_order_id := NEW.order_id;
    END IF;
    
    -- Solo proceder si tenemos un order_id válido
    IF target_order_id IS NOT NULL THEN
        -- Actualizar los totales de la orden
        UPDATE orders 
        SET 
            total_amount = (
                SELECT COALESCE(SUM(subtotal), 0) 
                FROM order_items 
                WHERE order_id = target_order_id
            ),
            total = (
                SELECT COALESCE(SUM(subtotal), 0) 
                FROM order_items 
                WHERE order_id = target_order_id
            ),
            updated_at = NOW()
        WHERE id = target_order_id;
    END IF;
    
    -- Retornar el record apropiado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el trigger mejorado
CREATE TRIGGER sync_order_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_totals();

-- 4. Función para asignar seller_id a órdenes huérfanas
CREATE OR REPLACE FUNCTION assign_orphan_orders_to_seller(seller_user_id UUID)
RETURNS TABLE(
    order_id UUID,
    previous_seller_id UUID,
    new_seller_id UUID,
    total_amount DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Actualizar órdenes sin seller_id
    UPDATE orders 
    SET seller_id = seller_user_id
    WHERE seller_id IS NULL;
    
    -- Retornar las órdenes que fueron actualizadas
    RETURN QUERY
    SELECT 
        o.id as order_id,
        NULL::UUID as previous_seller_id,
        o.seller_id as new_seller_id,
        o.total_amount,
        o.created_at
    FROM orders o
    WHERE o.seller_id = seller_user_id
    AND o.updated_at >= NOW() - INTERVAL '1 minute'
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para obtener estadísticas de órdenes
CREATE OR REPLACE FUNCTION get_order_statistics()
RETURNS TABLE(
    total_orders BIGINT,
    orders_with_seller BIGINT,
    orphan_orders BIGINT,
    recent_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM orders WHERE seller_id IS NOT NULL) as orders_with_seller,
        (SELECT COUNT(*) FROM orders WHERE seller_id IS NULL) as orphan_orders,
        (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_orders;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para sincronizar totales existentes de forma segura
CREATE OR REPLACE FUNCTION sync_existing_order_totals()
RETURNS TABLE(
    order_id UUID,
    old_total DECIMAL,
    new_total DECIMAL,
    items_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH order_calculations AS (
        SELECT 
            o.id,
            o.total_amount as old_total,
            COALESCE(SUM(oi.subtotal), 0) as calculated_total,
            COUNT(oi.id) as items_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id, o.total_amount
    )
    UPDATE orders 
    SET 
        total_amount = oc.calculated_total,
        total = oc.calculated_total,
        updated_at = NOW()
    FROM order_calculations oc
    WHERE orders.id = oc.id
    AND (orders.total_amount != oc.calculated_total OR orders.total_amount IS NULL)
    RETURNING orders.id, oc.old_total, orders.total_amount, oc.items_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para diagnosticar problemas de órdenes
CREATE OR REPLACE FUNCTION diagnose_order_issues()
RETURNS TABLE(
    issue_type TEXT,
    order_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Órdenes sin seller_id
    RETURN QUERY
    SELECT 
        'MISSING_SELLER_ID'::TEXT as issue_type,
        o.id as order_id,
        'Orden sin seller_id asignado'::TEXT as description,
        o.created_at
    FROM orders o
    WHERE o.seller_id IS NULL
    ORDER BY o.created_at DESC;
    
    -- Órdenes con totales incorrectos
    RETURN QUERY
    SELECT 
        'INCORRECT_TOTAL'::TEXT as issue_type,
        o.id as order_id,
        ('Total en orden: ' || COALESCE(o.total_amount::TEXT, 'NULL') || 
         ', Total calculado: ' || COALESCE(SUM(oi.subtotal)::TEXT, '0'))::TEXT as description,
        o.created_at
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id, o.total_amount, o.created_at
    HAVING o.total_amount != COALESCE(SUM(oi.subtotal), 0) OR o.total_amount IS NULL
    ORDER BY o.created_at DESC;
    
    -- Órdenes sin items
    RETURN QUERY
    SELECT 
        'NO_ITEMS'::TEXT as issue_type,
        o.id as order_id,
        'Orden sin items asociados'::TEXT as description,
        o.created_at
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.id IS NULL
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. Ejecutar sincronización de totales existentes
SELECT sync_existing_order_totals();

-- 9. Mostrar estadísticas finales
SELECT * FROM get_order_statistics();

-- 10. Mostrar diagnóstico de problemas
SELECT * FROM diagnose_order_issues();
