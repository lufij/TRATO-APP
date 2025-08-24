-- =====================================================
-- FIX CONSTRAINT STATUS ÓRDENES
-- =====================================================

-- 1. Verificar constraint actual
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'orders_status_check';

-- 2. Eliminar constraint problemático
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- 3. Crear constraint correcto con todos los estados
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pending', 'accepted', 'ready', 'assigned', 
    'picked-up', 'in-transit', 'delivered', 
    'completed', 'cancelled', 'rejected'
));

-- 4. Verificar que se puede actualizar ahora
UPDATE orders 
SET status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b'
AND seller_id = '561711e7-a66e-4166-93f0-3038666c4096';

-- 5. Confirmar resultado
SELECT 
    'FIX EXITOSO:' as resultado,
    id,
    status,
    accepted_at
FROM orders 
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
