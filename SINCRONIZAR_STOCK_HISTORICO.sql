-- 🔄 SINCRONIZAR STOCK CON HISTORIAL DE VENTAS
-- Este script corrige el stock de productos basado en ventas históricas

-- PASO 1: Crear función para calcular stock real
CREATE OR REPLACE FUNCTION calcular_stock_real()
RETURNS TABLE (
    producto_id UUID,
    nombre_producto TEXT,
    stock_actual INTEGER,
    total_vendido BIGINT,
    stock_corregido INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH ventas_confirmadas AS (
        SELECT 
            oi.product_id,
            oi.product_name,
            SUM(oi.quantity) as cantidad_vendida
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status IN ('completed', 'delivered', 'accepted', 'ready', 'picked-up')
        GROUP BY oi.product_id, oi.product_name
    )
    SELECT 
        p.id::UUID as producto_id,
        p.name::TEXT as nombre_producto,
        p.stock_quantity::INTEGER as stock_actual,
        COALESCE(v.cantidad_vendida, 0)::BIGINT as total_vendido,
        GREATEST(0, p.stock_quantity - COALESCE(v.cantidad_vendida, 0))::INTEGER as stock_corregido
    FROM products p
    LEFT JOIN ventas_confirmadas v ON p.id = v.product_id
    WHERE p.stock_quantity IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Ver qué productos necesitan corrección
SELECT * FROM calcular_stock_real()
WHERE stock_actual != stock_corregido;

-- PASO 3: Aplicar correcciones de stock
UPDATE products 
SET 
    stock_quantity = subquery.stock_corregido,
    is_available = CASE 
        WHEN subquery.stock_corregido > 0 THEN true 
        ELSE false 
    END,
    updated_at = NOW()
FROM (
    SELECT * FROM calcular_stock_real()
    WHERE stock_actual != stock_corregido
) AS subquery
WHERE products.id = subquery.producto_id;

-- PASO 4: Verificar resultados
SELECT 
    'DESPUÉS DE CORRECCIÓN' as estado,
    p.name,
    p.stock_quantity as stock_final,
    p.is_available
FROM products p
WHERE p.name ILIKE '%sopa%' 
   OR p.name ILIKE '%calcoman%'
ORDER BY p.name;

-- PASO 5: Log de cambios aplicados (CORREGIDO)
-- Solo crear notificación si hay un admin y si hay cambios
DO $$
DECLARE
    admin_id UUID;
    cambios_count INTEGER;
BEGIN
    -- Verificar si hay cambios pendientes
    SELECT COUNT(*) INTO cambios_count
    FROM (
        SELECT * FROM calcular_stock_real()
        WHERE stock_actual != stock_corregido
    ) as pending_changes;
    
    -- Solo proceder si hay cambios
    IF cambios_count > 0 THEN
        -- Buscar un admin o cualquier usuario válido
        SELECT id INTO admin_id 
        FROM users 
        WHERE role = 'admin' 
        LIMIT 1;
        
        -- Si no hay admin, usar el primer usuario disponible
        IF admin_id IS NULL THEN
            SELECT id INTO admin_id 
            FROM users 
            LIMIT 1;
        END IF;
        
        -- Si hay un usuario válido, crear la notificación
        IF admin_id IS NOT NULL THEN
            INSERT INTO notifications (
                recipient_id, 
                type, 
                title, 
                message, 
                created_at
            ) VALUES (
                admin_id,
                'system',
                'Stock Sincronizado',
                'Stock corregido para ' || cambios_count || ' productos basado en historial de ventas',
                NOW()
            );
        END IF;
        
        RAISE NOTICE 'Sincronización completada: % productos actualizados', cambios_count;
    ELSE
        RAISE NOTICE 'No hay productos que necesiten sincronización';
    END IF;
END $$;
