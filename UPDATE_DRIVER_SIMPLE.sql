-- =====================================================
-- SCRIPT SIMPLE PARA ACTUALIZAR SISTEMA DE REPARTIDORES
-- =====================================================
-- Ejecuta estas consultas una por una en el SQL Editor de Supabase

-- 1. Agregar campos de timestamps
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- 2. Agregar campos de notas
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Agregar campos de dirección
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT DEFAULT 'Dirección del vendedor';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT 'Dirección del comprador';

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON orders(driver_id, status);

-- 5. Verificar que todo esté correcto
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('picked_up_at', 'in_transit_at', 'delivered_at', 'driver_id');
