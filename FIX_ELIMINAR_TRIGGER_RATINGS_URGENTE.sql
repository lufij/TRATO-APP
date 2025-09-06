-- 🚨 SOLUCIÓN URGENTE: Eliminar trigger problemático de calificaciones
-- PROBLEMA: El trigger crea automáticamente registros en 'ratings' al marcar como 'delivered'
-- SOLUCIÓN: Eliminar el trigger que causa violaciones RLS

-- 1️⃣ VERIFICAR SI EL TRIGGER EXISTE
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pending_ratings'
  AND event_object_table = 'orders';

-- 2️⃣ ELIMINAR EL TRIGGER PROBLEMÁTICO
DROP TRIGGER IF EXISTS trigger_create_pending_ratings ON orders;

-- 3️⃣ TAMBIÉN ELIMINAR LA FUNCIÓN (OPCIONAL)
-- DROP FUNCTION IF EXISTS create_pending_ratings_on_delivery();

-- 4️⃣ VERIFICAR QUE FUE ELIMINADO
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pending_ratings'
  AND event_object_table = 'orders';

-- 5️⃣ MOSTRAR TRIGGERS RESTANTES EN ORDERS
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

-- ✅ MENSAJE DE ÉXITO
SELECT '🎉 Trigger problemático eliminado. El botón "Marcar como Entregado" debería funcionar ahora.' as resultado;
