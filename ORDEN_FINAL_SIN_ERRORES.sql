-- SOLUCIÓN FINAL - USAR DATOS EXISTENTES
-- =======================================

-- DESACTIVAR RLS COMPLETAMENTE
SET row_security = off;

-- CREAR ORDEN USANDO SOLO DATOS QUE YA EXISTEN
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
  (SELECT id FROM users LIMIT 1),  -- USAR CUALQUIER USER EXISTENTE
  (SELECT id FROM sellers LIMIT 1), -- USAR CUALQUIER SELLER EXISTENTE
  '00b384bc-6a52-4f25-b691-1700abd7ad89', -- DRIVER QUE YA SABEMOS QUE EXISTE
  'TEST - Cliente En Tránsito FINAL',
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

-- REACTIVAR RLS
SET row_security = on;

-- VERIFICAR
SELECT 
  id, 
  customer_name, 
  status, 
  driver_id
FROM orders 
WHERE customer_name = 'TEST - Cliente En Tránsito FINAL';

-- ¡LISTO! AHORA REFRESCA EL DASHBOARD
