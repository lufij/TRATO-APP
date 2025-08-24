-- EJECUTAR ESTE SQL EN SUPABASE DASHBOARD DIRECTAMENTE
-- Ve a https://supabase.com/dashboard > Tu proyecto > SQL Editor

-- 1. Ver todos los repartidores disponibles
SELECT id, name, email, role FROM users WHERE role = 'repartidor';

-- 2. Actualizar la orden para asignarla al repartidor "Luis" (el que está logueado)
-- CAMBIA 'NUEVO_ID_DEL_REPARTIDOR' por el ID que aparezca en el paso 1
UPDATE orders 
SET driver_id = 'NUEVO_ID_DEL_REPARTIDOR'
WHERE id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';

-- 3. Verificar que se asignó
SELECT 
    o.id, 
    o.status, 
    o.customer_name,
    o.driver_id,
    u.name as repartidor
FROM orders o
LEFT JOIN users u ON o.driver_id = u.id
WHERE o.id = 'c5b674fb-51a4-4671-bd44-2c1c2156f98b';
