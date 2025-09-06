-- ACTUALIZAR ORDEN ESPECÍFICA A "RECOGIDA"
-- =========================================

-- 1. PRIMERO: Ver el estado actual de la orden
SELECT 
  id,
  status,
  driver_id,
  total,
  picked_up_at,
  updated_at
FROM orders 
WHERE id = '5eab308f-e896-41c2-9bd0-03fcc543bb82';

-- 2. SEGUNDO: Actualizar la orden a "picked_up" (recogida)
UPDATE orders 
SET 
  status = 'picked_up',
  picked_up_at = NOW(),
  updated_at = NOW()
WHERE id = '5eab308f-e896-41c2-9bd0-03fcc543bb82' 
  AND driver_id = '00b384bc-6a52-4f25-b691-1700abd7ad89';

-- 3. TERCERO: Verificar que se actualizó correctamente
SELECT 
  id,
  status,
  driver_id,
  total,
  picked_up_at,
  updated_at
FROM orders 
WHERE id = '5eab308f-e896-41c2-9bd0-03fcc543bb82';
