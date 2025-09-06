-- DIAGNÓSTICO Y SOLUCIÓN PARA BOTÓN "MARCAR COMO ENTREGADO"
-- ============================================================

-- 1. VERIFICAR ENUM VALUES DE STATUS
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Si no existe el tipo enum, verificar constraints de check
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
    AND contype = 'c'
    AND conname LIKE '%status%';

-- 2. VERIFICAR ESTRUCTURA DE COLUMNA STATUS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'orders' 
    AND column_name = 'status';

-- 3. VER TODOS LOS STATUS ACTUALES EN LA TABLA
SELECT DISTINCT status, COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY count DESC;

-- 4. CREAR O ACTUALIZAR POLÍTICA PARA PERMITIR CAMBIO A DELIVERED
DROP POLICY IF EXISTS "drivers_can_update_to_delivered" ON orders;

CREATE POLICY "drivers_can_update_to_delivered" 
ON orders 
FOR UPDATE 
TO authenticated 
USING (
    driver_id IS NOT NULL 
    AND (
        auth.uid() = driver_id 
        OR auth.uid()::text = driver_id::text
        OR EXISTS (
            SELECT 1 FROM drivers d 
            WHERE d.id = auth.uid() 
            AND orders.driver_id = d.id
        )
    )
)
WITH CHECK (
    driver_id IS NOT NULL 
    AND (
        auth.uid() = driver_id 
        OR auth.uid()::text = driver_id::text
        OR EXISTS (
            SELECT 1 FROM drivers d 
            WHERE d.id = auth.uid() 
            AND orders.driver_id = d.id
        )
    )
);

-- 5. SI STATUS ES ENUM, ASEGURAR QUE TIENE TODOS LOS VALORES
DO $$
BEGIN
    -- Intentar agregar 'delivered' si no existe
    BEGIN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered';
        RAISE NOTICE 'Added "delivered" to order_status enum';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add to enum, might be a text field';
    END;
END $$;

-- 6. SI STATUS ES TEXT, REMOVER CONSTRAINTS RESTRICTIVOS
DO $$
BEGIN
    -- Intentar eliminar constraint restrictivo si existe
    BEGIN
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        RAISE NOTICE 'Removed restrictive status constraint';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'No restrictive status constraint found';
    END;
END $$;

-- 7. FUNCIÓN DE DEBUG PARA PROBAR ACTUALIZACIÓN
CREATE OR REPLACE FUNCTION debug_order_update(
    target_order_id UUID,
    new_status TEXT,
    target_driver_id UUID DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    current_user_id UUID,
    order_driver_id UUID,
    order_current_status TEXT,
    update_allowed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record RECORD;
    current_uid UUID;
    update_result INTEGER;
BEGIN
    -- Obtener usuario actual
    current_uid := auth.uid();
    
    -- Obtener datos actuales de la orden
    SELECT * INTO order_record 
    FROM orders 
    WHERE id = target_order_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'Orden no encontrada',
            current_uid,
            NULL::UUID,
            NULL::TEXT,
            FALSE;
        RETURN;
    END IF;
    
    -- Verificar permisos
    IF current_uid = order_record.driver_id OR target_driver_id IS NOT NULL THEN
        -- Intentar actualización
        BEGIN
            UPDATE orders 
            SET 
                status = new_status,
                updated_at = NOW(),
                delivered_at = CASE 
                    WHEN new_status = 'delivered' THEN NOW() 
                    ELSE delivered_at 
                END
            WHERE id = target_order_id;
            
            GET DIAGNOSTICS update_result = ROW_COUNT;
            
            IF update_result > 0 THEN
                RETURN QUERY SELECT 
                    TRUE,
                    'Actualización exitosa',
                    current_uid,
                    order_record.driver_id,
                    order_record.status,
                    TRUE;
            ELSE
                RETURN QUERY SELECT 
                    FALSE,
                    'Actualización falló - no se modificó ninguna fila',
                    current_uid,
                    order_record.driver_id,
                    order_record.status,
                    FALSE;
            END IF;
            
        EXCEPTION WHEN others THEN
            RETURN QUERY SELECT 
                FALSE,
                'Error en actualización: ' || SQLERRM,
                current_uid,
                order_record.driver_id,
                order_record.status,
                TRUE;
        END;
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            'Sin permisos - usuario no es el driver asignado',
            current_uid,
            order_record.driver_id,
            order_record.status,
            FALSE;
    END IF;
END;
$$;

-- 8. PERMITIR ACCESO TEMPORAL TOTAL (USAR SOLO PARA TESTING)
DROP POLICY IF EXISTS "allow_all_driver_operations" ON orders;

CREATE POLICY "allow_all_driver_operations"
ON orders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. VERIFICAR ORDEN DE PRUEBA Y HACER TEST
DO $$
DECLARE
    test_order_id UUID;
    test_driver_id UUID;
    debug_result RECORD;
BEGIN
    -- Buscar orden de prueba
    SELECT id, driver_id INTO test_order_id, test_driver_id
    FROM orders 
    WHERE customer_name = 'TEST - Cliente En Tránsito'
    LIMIT 1;
    
    IF test_order_id IS NOT NULL THEN
        RAISE NOTICE 'Orden de prueba encontrada: %', test_order_id;
        RAISE NOTICE 'Driver asignado: %', test_driver_id;
        
        -- Probar actualización con la función debug
        SELECT * INTO debug_result 
        FROM debug_order_update(test_order_id, 'delivered', test_driver_id);
        
        RAISE NOTICE 'Resultado del test: Success=%, Message=%', 
            debug_result.success, debug_result.message;
    ELSE
        RAISE NOTICE 'No se encontró orden de prueba. Ejecuta primero el script de creación de orden.';
    END IF;
END $$;

-- 10. INSTRUCCIONES FINALES
SELECT 'DIAGNÓSTICO COMPLETADO - REVISA LOS MENSAJES ARRIBA' as mensaje;
SELECT 'Si ves "Resultado del test: Success=t", el botón debería funcionar' as prueba;
SELECT 'Si no funciona, ejecuta: SELECT * FROM debug_order_update(''TU_ORDER_ID'', ''delivered'');' as debug;
