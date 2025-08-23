-- =====================================================
-- ELIMINACIÓN AGRESIVA DE FUNCIONES CONFLICTIVAS
-- =====================================================
-- Ejecutar PRIMERO este script para limpiar todas las funciones

-- 🗑️ ELIMINAR TODAS LAS VERSIONES DE update_order_status
DROP FUNCTION IF EXISTS public.update_order_status(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(UUID, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(UUID, TEXT, UUID, TEXT, TEXT) CASCADE;

-- 🗑️ ELIMINAR OTRAS FUNCIONES RELACIONADAS
DROP FUNCTION IF EXISTS public.get_driver_delivery_history CASCADE;
DROP FUNCTION IF EXISTS public.get_delivery_history CASCADE;

-- ✅ VERIFICAR QUE SE ELIMINARON
SELECT 'Funciones eliminadas correctamente' as status;
