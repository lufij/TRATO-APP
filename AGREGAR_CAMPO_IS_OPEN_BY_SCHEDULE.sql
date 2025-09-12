-- Verificar si la columna is_open_by_schedule existe y sus valores actuales
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sellers' AND column_name = 'is_open_by_schedule';

-- Ver todos los vendedores y su estado actual
SELECT id, business_name, is_open_now, is_open_by_schedule, business_hours
FROM sellers
ORDER BY business_name;

-- Si la columna existe pero tiene valores NULL, actualizarlos a true por defecto
UPDATE sellers 
SET is_open_by_schedule = true 
WHERE is_open_by_schedule IS NULL;