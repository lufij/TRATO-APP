-- =====================================================
-- DIAGNÓSTICO COMPLETO SISTEMA DE REPARTIDORES
-- =====================================================

-- 1. Verificar función update_order_status existe y funciona
SELECT 
    'FUNCIÓN UPDATE_ORDER_STATUS:' as categoria,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'update_order_status' 
AND routine_schema = 'public';

-- 2. Verificar órdenes asignadas a repartidores
SELECT 
    'ÓRDENES ASIGNADAS:' as categoria,
    o.id,
    o.status,
    o.driver_id,
    o.delivery_address,
    o.total,
    o.accepted_at,
    o.ready_at,
    o.picked_up_at,
    o.delivered_at
FROM orders o
WHERE o.driver_id IS NOT NULL
AND o.status IN ('assigned', 'picked-up', 'in-transit', 'delivered')
ORDER BY o.created_at DESC
LIMIT 5;

-- 3. Verificar que la función acepta los estados correctos
-- Crear orden de prueba para repartidor si no existe
INSERT INTO orders (
    id,
    buyer_id,
    seller_id,
    driver_id,
    subtotal,
    delivery_fee,
    total,
    delivery_type,
    delivery_address,
    customer_notes,
    phone_number,
    customer_name,
    status,
    estimated_time,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '561711e7-a66e-4166-93f0-3038666c4096', -- buyer_id
    'a09b7fd-8e78-4a11-a8f6-0ea805f15b4b', -- seller_id corregido  
    '561711e7-a66e-4166-93f0-3038666c4096', -- driver_id
    50.00,
    15.00,
    65.00,
    'delivery',
    'Dirección de prueba para entrega',
    'Orden de prueba para repartidor',
    '+50250404987',
    'Cliente de Prueba',
    'assigned',
    30,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Verificar que se puede actualizar a picked-up
SELECT 
    'PRUEBA PICKED-UP:' as test,
    'Intentando actualizar a picked-up' as accion;

-- 5. Mostrar resultado final
SELECT 
    'ORDEN DE PRUEBA CREADA:' as resultado,
    id,
    status,
    driver_id,
    delivery_address,
    total
FROM orders 
WHERE id = '11111111-1111-1111-1111-111111111111';
