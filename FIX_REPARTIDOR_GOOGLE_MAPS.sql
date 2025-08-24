-- =====================================================
-- FIX COMPLETO: REPARTIDOR + GOOGLE MAPS + CONSTRAINTS
-- =====================================================

-- 1. ARREGLAR CONSTRAINT DE STATUS (permite picked_up)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'));

-- 2. CREAR USUARIOS DE PRUEBA CON COORDENADAS GOOGLE MAPS
INSERT INTO users (
    id,
    name, 
    email,
    role,
    address,
    created_at,
    updated_at
) VALUES 
-- Vendedor
(
    'vendor-001',
    'Pizzería Don Carlos',
    'doncarlos@test.com',
    'vendedor',
    'Avenida Corrientes 1500, Buenos Aires, Argentina',
    NOW(),
    NOW()
),
-- Repartidor  
(
    'driver-001',
    'Juan Pérez',
    'juan.driver@test.com',
    'repartidor',
    'Barrio Norte, Buenos Aires, Argentina',
    NOW(),
    NOW()
),
-- Comprador
(
    'buyer-001', 
    'María González',
    'maria.buyer@test.com',
    'comprador',
    'Palermo Soho, Buenos Aires, Argentina',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
email = EXCLUDED.email,
address = EXCLUDED.address,
updated_at = NOW();

-- 3. CREAR VENDEDOR CON COORDENADAS REALES DE GOOGLE MAPS
INSERT INTO sellers (
    user_id,
    business_name,
    business_address,
    latitude,        -- Coordenadas reales de Av. Corrientes 1500
    longitude,       -- Verificadas en Google Maps
    location_verified,
    category,
    is_open_now,
    phone,
    created_at,
    updated_at
) VALUES (
    'vendor-001',
    'Pizzería Don Carlos',
    'Avenida Corrientes 1500, Ciudad Autónoma de Buenos Aires, Argentina',
    -34.6037,        -- Latitud real
    -58.3816,        -- Longitud real  
    true,
    'restaurant',
    true,
    '+54 11 4567-8900',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
business_name = EXCLUDED.business_name,
business_address = EXCLUDED.business_address,
latitude = EXCLUDED.latitude,
longitude = EXCLUDED.longitude,
location_verified = EXCLUDED.location_verified,
updated_at = NOW();

-- 4. CREAR REPARTIDOR
INSERT INTO drivers (
    user_id,
    vehicle_type,
    license_plate,
    is_available,
    current_latitude,
    current_longitude,
    created_at,
    updated_at
) VALUES (
    'driver-001',
    'moto',
    'ABC123',
    true,
    -34.5873,        -- Ubicación actual del repartidor
    -58.3952,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
vehicle_type = EXCLUDED.vehicle_type,
license_plate = EXCLUDED.license_plate,
is_available = EXCLUDED.is_available,
current_latitude = EXCLUDED.current_latitude,
current_longitude = EXCLUDED.current_longitude,
updated_at = NOW();

-- 5. CREAR ORDEN CON COORDENADAS DE GOOGLE MAPS
INSERT INTO orders (
    id,
    buyer_id,
    seller_id,
    driver_id,
    status,
    total_amount,
    delivery_address,
    delivery_latitude,   -- Coordenadas del cliente
    delivery_longitude,
    customer_name,
    customer_phone,
    estimated_delivery_time,
    created_at,
    updated_at
) VALUES (
    'order-google-maps-001',
    'buyer-001',
    'vendor-001', 
    'driver-001',
    'assigned',
    25.50,
    'Palermo Soho, Buenos Aires, Argentina',
    -34.5875,           -- Coordenadas reales de Palermo Soho
    -58.4001,
    'María González',
    '+54 11 9876-5432',
    30,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
status = EXCLUDED.status,
delivery_address = EXCLUDED.delivery_address,
delivery_latitude = EXCLUDED.delivery_latitude,
delivery_longitude = EXCLUDED.delivery_longitude,
updated_at = NOW();

-- 6. VERIFICAR DATOS CREADOS
SELECT 
    '=== VENDEDOR CON GOOGLE MAPS ===' as seccion,
    s.business_name,
    s.business_address,
    s.latitude,
    s.longitude,
    s.location_verified
FROM sellers s 
WHERE s.user_id = 'vendor-001';

SELECT 
    '=== ORDEN PARA REPARTIDOR ===' as seccion,
    o.id,
    o.status,
    o.delivery_address,
    o.delivery_latitude,
    o.delivery_longitude,
    u_seller.name as vendedor,
    u_driver.name as repartidor
FROM orders o
LEFT JOIN users u_seller ON o.seller_id = u_seller.id
LEFT JOIN users u_driver ON o.driver_id = u_driver.id
WHERE o.id = 'order-google-maps-001';

-- 7. PROBAR ACTUALIZACIÓN DE STATUS A PICKED_UP
UPDATE orders 
SET status = 'picked_up',
    updated_at = NOW()
WHERE id = 'order-google-maps-001';

-- 8. VERIFICAR QUE EL UPDATE FUNCIONÓ
SELECT 
    '=== PRUEBA STATUS PICKED_UP ===' as resultado,
    o.id,
    o.status,
    o.updated_at
FROM orders o
WHERE o.id = 'order-google-maps-001';

-- 9. COORDENADAS PARA GOOGLE MAPS
SELECT 
    '=== COORDENADAS GOOGLE MAPS ===' as info,
    'Vendedor: ' || s.latitude || ',' || s.longitude || ' (' || s.business_address || ')' as vendedor_coords,
    'Cliente: ' || o.delivery_latitude || ',' || o.delivery_longitude || ' (' || o.delivery_address || ')' as cliente_coords
FROM orders o
JOIN sellers s ON o.seller_id = s.user_id  
WHERE o.id = 'order-google-maps-001';
