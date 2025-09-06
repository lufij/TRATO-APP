-- SOLUCIÓN ULTRA SIMPLE - SOLO ACTUALIZACIÓN DIRECTA
-- ===================================================
-- NO usar RPC functions, solo UPDATE directo

-- Verificar que la orden existe y pertenece al repartidor
SELECT 
  id,
  status,
  driver_id,
  total,
  delivery_address,
  created_at
FROM orders 
WHERE driver_id IS NOT NULL 
  AND status IN ('assigned', 'picked_up', 'in_transit')
ORDER BY created_at DESC
LIMIT 5;

-- Si ves una orden con status 'assigned', copia su ID y ejecuta:
-- UPDATE orders 
-- SET status = 'picked_up', picked_up_at = NOW(), updated_at = NOW()
-- WHERE id = 'PASTE_ORDER_ID_HERE' AND driver_id = 'PASTE_DRIVER_ID_HERE';
