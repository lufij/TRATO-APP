-- SOLUCIÓN DIRECTA - SIN MÁS ERRORES
-- ==================================

-- 1. CREAR USER CON ROLE VÁLIDO (customer en lugar de buyer)
INSERT INTO users (id, email, name, role, created_at) 
VALUES (gen_random_uuid(), 'customer@test.com', 'Test Customer', 'customer', NOW())
ON CONFLICT DO NOTHING
RETURNING id, role;

-- 2. CREAR ORDEN DE PRUEBA DIRECTA (SIN RLS)
SET row_security = off;

INSERT INTO orders (
  id,
  buyer_id,
  seller_id, 
  driver_id,
  customer_name,
  customer_phone,
  delivery_address,
  total,
  delivery_fee,
  status,
  delivery_type,
  payment_method,
  created_at,
  updated_at,
  picked_up_at,
  in_transit_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
  (SELECT id FROM sellers LIMIT 1),
  '00b384bc-6a52-4f25-b691-1700abd7ad89',
  'TEST - Cliente En Tránsito',
  '+506 8888-8888',
  'Dirección de prueba, San José',
  15000,
  2000,
  'in_transit',
  'delivery',
  'cash',
  NOW(),
  NOW(),
  NOW(),
  NOW()
);

SET row_security = on;

-- 3. VERIFICAR QUE SE CREÓ
SELECT 
  id, 
  customer_name, 
  status, 
  buyer_id,
  seller_id,
  driver_id
FROM orders 
WHERE customer_name = 'TEST - Cliente En Tránsito';

-- LISTO - AHORA REFRESCA EL DASHBOARD DEL REPARTIDOR
