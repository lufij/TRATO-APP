-- ARREGLO URGENTE: CONSTRAINT + DATOS DE PRUEBA
-- =============================================

-- 1. Arreglar constraint para permitir picked_up
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'));

-- 2. Crear usuarios mínimos con UUIDs válidos
INSERT INTO users (id, name, email, role, address) VALUES 
('11111111-1111-1111-1111-111111111111', 'Pizzería Test', 'vendor@test.com', 'vendedor', 'Buenos Aires'),
('22222222-2222-2222-2222-222222222222', 'Conductor Test', 'driver@test.com', 'repartidor', 'Buenos Aires'),
('33333333-3333-3333-3333-333333333333', 'Cliente Test', 'buyer@test.com', 'comprador', 'Buenos Aires')
ON CONFLICT (id) DO NOTHING;

-- 3. Crear vendedor con coordenadas Google Maps
INSERT INTO sellers (user_id, business_name, business_address, latitude, longitude, location_verified, is_open_now) VALUES 
('11111111-1111-1111-1111-111111111111', 'Pizzería Test', 'Avenida Corrientes 1500, Buenos Aires, Argentina', -34.6037, -58.3816, true, true)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Crear orden de prueba asignada al repartidor
INSERT INTO orders (
    id, buyer_id, seller_id, driver_id, status, total_amount, 
    delivery_address, customer_name, customer_phone
) VALUES (
    '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 
    'assigned', 25.50, 'Palermo, Buenos Aires', 'Cliente Test', '+54 11 1234-5678'
) ON CONFLICT (id) DO NOTHING;

-- 5. Verificar datos creados
SELECT 'VENDEDOR CON GOOGLE MAPS' as info, business_name, latitude, longitude FROM sellers WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT 'ORDEN PARA REPARTIDOR' as info, id, status, customer_name FROM orders WHERE id = '44444444-4444-4444-4444-444444444444';
