-- USAR SOLO DATOS EXISTENTES - SIN CREAR NADA NUEVO
-- ==================================================

-- DESACTIVAR RLS
SET row_security = off;

-- CREAR ORDEN USANDO DATOS REALES QUE YA EXISTEN
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
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM sellers LIMIT 1),
  '00b384bc-6a52-4f25-b691-1700abd7ad89',
  'TEST - En Tránsito',
  '+506 8888-8888',
  'San José',
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

-- REACTIVAR RLS
SET row_security = on;

-- VER LA ORDEN CREADA
SELECT id, customer_name, status FROM orders WHERE customer_name = 'TEST - En Tránsito';
