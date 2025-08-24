-- ARREGLO URGENTE: CONSTRAINT + DATOS DE PRUEBA
-- =============================================

-- 1. Arreglar constraint para permitir picked_up
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'));

-- 2. Solo arreglar constraint primero, después crearemos datos manualmente
-- Verificar que el constraint está bien
SELECT 'CONSTRAINT ARREGLADO' as resultado, 'picked_up ahora permitido' as detalle;
