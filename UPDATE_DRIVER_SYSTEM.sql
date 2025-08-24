-- =====================================================
-- ACTUALIZACIÓN DEL SISTEMA DE REPARTIDORES - TRATO APP
-- =====================================================
-- Este script agrega los campos necesarios para el seguimiento completo de entregas

BEGIN;

-- 1. Agregar campos de timestamps para el seguimiento de entregas
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- 2. Agregar campos de notas para repartidores
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Agregar campos de dirección si no existen
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_address TEXT DEFAULT 'Dirección del vendedor',
ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT 'Dirección del comprador';

-- 4. Crear índices para mejorar el rendimiento de consultas de repartidores
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON orders(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_ready ON orders(status) WHERE status = 'ready';

-- 5. Función para asignar automáticamente repartidores (opcional)
CREATE OR REPLACE FUNCTION auto_assign_driver_to_ready_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando una orden se marca como 'ready', podemos buscar un repartidor disponible
    IF NEW.status = 'ready' AND OLD.status != 'ready' AND NEW.driver_id IS NULL THEN
        -- Por ahora solo agregamos un log, la asignación se hará manualmente
        RAISE NOTICE 'Orden % marcada como lista para asignar repartidor', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear trigger para notificar cuando hay órdenes listas
DROP TRIGGER IF EXISTS trigger_ready_orders_notification ON orders;
CREATE TRIGGER trigger_ready_orders_notification
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_driver_to_ready_orders();

-- 7. Actualizar órdenes existentes que deberían tener timestamps
UPDATE orders 
SET accepted_at = updated_at 
WHERE status IN ('accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered') 
  AND accepted_at IS NULL;

UPDATE orders 
SET ready_at = updated_at 
WHERE status IN ('ready', 'assigned', 'picked_up', 'in_transit', 'delivered') 
  AND ready_at IS NULL;

UPDATE orders 
SET picked_up_at = updated_at 
WHERE status IN ('picked_up', 'in_transit', 'delivered') 
  AND picked_up_at IS NULL;

UPDATE orders 
SET in_transit_at = updated_at 
WHERE status IN ('in_transit', 'delivered') 
  AND in_transit_at IS NULL;

UPDATE orders 
SET delivered_at = updated_at 
WHERE status = 'delivered' 
  AND delivered_at IS NULL;

-- 8. Verificación final
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ ACTUALIZACIÓN DEL SISTEMA DE REPARTIDORES COMPLETADA';
    RAISE NOTICE '==============================================';
    
    RAISE NOTICE '📊 Campos agregados a la tabla orders:';
    RAISE NOTICE '   - picked_up_at, in_transit_at, delivered_at';
    RAISE NOTICE '   - accepted_at, ready_at, rejected_at';
    RAISE NOTICE '   - pickup_notes, delivery_notes, rejection_reason';
    RAISE NOTICE '   - pickup_address, delivery_address';
    
    RAISE NOTICE '🔧 Índices creados:';
    RAISE NOTICE '   - idx_orders_driver_id';
    RAISE NOTICE '   - idx_orders_driver_status';
    RAISE NOTICE '   - idx_orders_status_ready';
    
    RAISE NOTICE '⚡ Triggers configurados:';
    RAISE NOTICE '   - trigger_ready_orders_notification';
    
    RAISE NOTICE '✅ Sistema de repartidores listo para usar';
END $$;

COMMIT;

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN (ejecutar después del script)
-- =====================================================

-- Verificar que los campos existen
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('picked_up_at', 'in_transit_at', 'delivered_at', 'driver_id', 'pickup_notes', 'delivery_notes')
ORDER BY column_name;

-- Verificar órdenes listas para asignar repartidor
SELECT id, status, driver_id, customer_name, total, created_at
FROM orders 
WHERE status = 'ready' AND driver_id IS NULL
ORDER BY created_at DESC;

-- Verificar órdenes asignadas a repartidores
SELECT id, status, driver_id, customer_name, total, picked_up_at, in_transit_at, delivered_at
FROM orders 
WHERE driver_id IS NOT NULL
ORDER BY created_at DESC;
