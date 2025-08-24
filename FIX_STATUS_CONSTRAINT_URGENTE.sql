-- ARREGLAR CONSTRAINT DE STATUS URGENTE
-- El error indica que 'picked_up' no está permitido

-- 1. Eliminar constraint existente que está causando problemas
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_status_valid;

-- 2. Crear nuevo constraint que permita TODOS los estados necesarios
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pending',      -- Pedido creado, esperando aceptación
    'accepted',     -- Vendedor aceptó el pedido
    'ready',        -- Pedido listo para recoger
    'assigned',     -- Repartidor asignado
    'picked_up',    -- Pedido recogido por repartidor ✅
    'in_transit',   -- En camino al cliente ✅
    'delivered',    -- Entregado
    'cancelled'     -- Cancelado
));

-- 3. Verificar que el constraint se creó correctamente
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'orders_status_check';

-- 4. Probar actualización a picked_up
UPDATE orders 
SET status = 'picked_up', 
    picked_up_at = NOW()
WHERE driver_id IS NOT NULL 
AND status = 'assigned'
LIMIT 1;

SELECT 'CONSTRAINT ARREGLADO - picked_up permitido' as resultado;
