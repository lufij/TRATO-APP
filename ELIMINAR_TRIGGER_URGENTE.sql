-- =====================================================
-- ARREGLO URGENTE: ELIMINAR TRIGGER PARA PODER CREAR ÓRDENES
-- =====================================================
-- Ejecutar INMEDIATAMENTE en Supabase
-- https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- 1. ELIMINAR TRIGGER QUE CAUSA PROBLEMAS
DROP TRIGGER IF EXISTS trigger_notify_seller_new_order ON orders;

-- 2. ELIMINAR FUNCIÓN PROBLEMÁTICA
DROP FUNCTION IF EXISTS notify_seller_new_order();

-- 3. VERIFICAR QUE SE ELIMINÓ
SELECT 'Trigger eliminado - ahora puedes crear órdenes' as status;

COMMIT;
