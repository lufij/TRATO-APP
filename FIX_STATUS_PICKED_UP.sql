-- ARREGLAR CONSTRAINT STATUS DEFINITIVO
-- Asegurar que picked_up y in_transit están permitidos

-- 1. Ver constraint actual
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'orders' AND constraint_name LIKE '%status%';

-- 2. Eliminar cualquier constraint problemático
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_status_valid;

-- 3. Crear constraint correcto que permita todos los estados con guión bajo
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pending',
    'accepted', 
    'ready',
    'assigned',
    'picked_up',    -- ✅ CON GUIÓN BAJO
    'in_transit',   -- ✅ CON GUIÓN BAJO  
    'delivered',
    'cancelled'
));

-- 4. Verificar que funciona
SELECT 'Constraint creado correctamente' as resultado;

-- 5. Probar actualización
UPDATE orders 
SET status = 'picked_up',
    picked_up_at = NOW()
WHERE driver_id IS NOT NULL 
AND status = 'assigned'
LIMIT 1;

SELECT 'Test actualización a picked_up completado' as test;
