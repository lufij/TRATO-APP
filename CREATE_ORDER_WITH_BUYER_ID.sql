-- CREAR ORDEN DE PRUEBA CON TODOS LOS CAMPOS OBLIGATORIOS
-- ========================================================

-- Desactivar RLS temporalmente
SET row_security = off;

-- Crear orden de prueba con buyer_id
INSERT INTO orders (
  id,
  customer_name, 
  customer_phone, 
  delivery_address,
  total, 
  delivery_fee, 
  status, 
  delivery_type, 
  driver_id,
  buyer_id,  -- CAMPO OBLIGATORIO
  seller_id, -- CAMPO OBLIGATORIO  
  created_at, 
  updated_at, 
  picked_up_at, 
  in_transit_at,
  payment_method
) VALUES (
  gen_random_uuid(),
  'TEST - Cliente En Tránsito',
  '+506 8888-8888',
  'Dirección de prueba, San José',
  15000,
  2000,
  'in_transit',
  'delivery',
  '00b384bc-6a52-4f25-b691-1700abd7ad89',  -- driver_id
  (SELECT id FROM users WHERE role = 'buyer' LIMIT 1), -- buyer_id automático
  (SELECT id FROM sellers LIMIT 1),  -- seller_id automático
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  'cash'
);

-- Reactivar RLS
SET row_security = on;

-- Verificar que se creó correctamente
SELECT 
  id, 
  customer_name, 
  status, 
  driver_id, 
  buyer_id, 
  seller_id,
  delivery_type,
  total,
  delivery_fee
FROM orders 
WHERE customer_name = 'TEST - Cliente En Tránsito';

-- Si no hay users con role buyer, crear uno temporal
INSERT INTO users (id, email, name, role) VALUES 
('temp-buyer-id', 'buyer@test.com', 'Test Buyer', 'buyer')
ON CONFLICT (id) DO NOTHING;

-- Si el INSERT de arriba falló por falta de buyer/seller, usar este:
INSERT INTO orders (
  id,
  customer_name, 
  customer_phone, 
  delivery_address,
  total, 
  delivery_fee, 
  status, 
  delivery_type, 
  driver_id,
  buyer_id,
  seller_id,
  created_at, 
  updated_at, 
  picked_up_at, 
  in_transit_at,
  payment_method
) VALUES (
  gen_random_uuid(),
  'TEST - Cliente En Tránsito FIXED',
  '+506 8888-8888',
  'Dirección de prueba, San José',
  15000,
  2000,
  'in_transit',
  'delivery',
  '00b384bc-6a52-4f25-b691-1700abd7ad89',
  'temp-buyer-id',  -- buyer_id fijo
  (SELECT id FROM sellers LIMIT 1),  -- usar el primer seller
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  'cash'
) ON CONFLICT (customer_name) DO UPDATE SET
  status = 'in_transit',
  updated_at = NOW(),
  in_transit_at = NOW();

-- Verificar el resultado final
SELECT 
  id, 
  customer_name, 
  status, 
  driver_id, 
  buyer_id, 
  seller_id
FROM orders 
WHERE customer_name LIKE 'TEST - Cliente En Tránsito%'
ORDER BY created_at DESC;
