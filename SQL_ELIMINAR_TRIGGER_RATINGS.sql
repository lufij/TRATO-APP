-- 🚨 SOLUCIÓN DEFINITIVA: Eliminar trigger problemático de calificaciones
-- Ejecutar este SQL directamente en Supabase SQL Editor

-- 1️⃣ VERIFICAR QUE EL TRIGGER EXISTE (opcional)
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pending_ratings'
  AND event_object_table = 'orders';

-- 2️⃣ ELIMINAR EL TRIGGER PROBLEMÁTICO (EJECUTAR ESTE)
DROP TRIGGER IF EXISTS trigger_create_pending_ratings ON orders;

-- 3️⃣ VERIFICAR QUE FUE ELIMINADO (opcional)
SELECT count(*) as triggers_restantes
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_pending_ratings'
  AND event_object_table = 'orders';

-- 4️⃣ VER TODOS LOS TRIGGERS RESTANTES EN ORDERS (opcional)
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
ORDER BY trigger_name;
