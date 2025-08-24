-- VERIFICAR Y ARREGLAR ASIGNACION DE ORDEN AL REPARTIDOR CORRECTO

-- 1. Ver el ID del repartidor "Luis" (el que está logueado)
SELECT id, name, email, role 
FROM users 
WHERE name ILIKE '%luis%' AND role = 'repartidor';

-- 2. Ver la orden específica y su driver_id actual
SELECT 
    id as orden_id,
    status,
    customer_name,
    driver_id,
    total_amount,
    created_at
FROM orders 
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';

-- 3. REASIGNAR la orden al repartidor correcto (Luis que está logueado)
UPDATE orders 
SET driver_id = (
    SELECT id FROM users 
    WHERE name ILIKE '%luis%' AND role = 'repartidor' 
    LIMIT 1
)
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';

-- 4. Verificar que se asignó correctamente
SELECT 
    o.id as orden_id,
    o.status,
    o.customer_name,
    o.driver_id,
    u.name as repartidor_asignado,
    u.email
FROM orders o
LEFT JOIN users u ON o.driver_id = u.id
WHERE o.id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
