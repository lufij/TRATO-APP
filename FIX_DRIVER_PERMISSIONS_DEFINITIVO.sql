-- SCRIPT PARA SOLUCIONAR PROBLEMAS DE ACTUALIZACIÓN DE ÓRDENES
-- ================================================================

-- 1. VERIFICAR PERMISOS ACTUALES EN LA TABLA ORDERS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN 'RLS ACTIVADO - Puede bloquear actualizaciones'
        ELSE 'Sin RLS'
    END as estado_rls
FROM pg_tables 
WHERE tablename = 'orders';

-- 2. VER POLÍTICAS ACTUALES DE RLS
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'orders' 
    AND cmd IN ('UPDATE', 'ALL');

-- 3. CREAR/ACTUALIZAR POLÍTICA PARA REPARTIDORES
-- Permitir a los repartidores actualizar órdenes que tienen asignadas
DROP POLICY IF EXISTS "drivers_can_update_assigned_orders" ON orders;

CREATE POLICY "drivers_can_update_assigned_orders" 
ON orders 
FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = driver_id 
    AND status IN ('assigned', 'picked_up', 'in_transit')
)
WITH CHECK (
    auth.uid() = driver_id 
    AND status IN ('picked_up', 'in_transit', 'delivered')
);

-- 4. ASEGURAR QUE LA TABLA ORDERS TIENE LAS COLUMNAS NECESARIAS
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 5. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_orders_driver_status 
ON orders (driver_id, status) 
WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status_delivery 
ON orders (status, delivery_type) 
WHERE delivery_type = 'delivery';

-- 6. VERIFICAR QUE NO HAY TRIGGERS PROBLEMÁTICOS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
    AND event_manipulation = 'UPDATE';

-- 7. FUNCIÓN PARA DEBUG - VER DETALLES DE UNA ORDEN ESPECÍFICA
CREATE OR REPLACE FUNCTION debug_order_permissions(order_uuid UUID)
RETURNS TABLE(
    order_id UUID,
    current_status TEXT,
    driver_id UUID,
    current_user_id UUID,
    can_update BOOLEAN,
    reason TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.status,
        o.driver_id,
        auth.uid(),
        CASE 
            WHEN auth.uid() = o.driver_id THEN true
            ELSE false
        END,
        CASE 
            WHEN auth.uid() IS NULL THEN 'Usuario no autenticado'
            WHEN o.driver_id IS NULL THEN 'Orden sin repartidor asignado'
            WHEN auth.uid() != o.driver_id THEN 'Usuario no es el repartidor asignado'
            ELSE 'Permisos OK'
        END
    FROM orders o
    WHERE o.id = order_uuid;
END;
$$;

-- 8. SCRIPT DE VERIFICACIÓN FINAL
SELECT 'CONFIGURACIÓN COMPLETADA - EJECUTA LAS SIGUIENTES CONSULTAS PARA VERIFICAR:' as mensaje;
SELECT '1. SELECT * FROM debug_order_permissions(''TU_ORDER_ID_AQUI'');' as consulta_1;
SELECT '2. Refresca la página del repartidor y prueba los botones' as paso_2;
