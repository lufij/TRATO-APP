-- AGREGAR COLUMNA DAILY_PRODUCT_ID A ORDER_ITEMS
-- Ejecutar este SQL en Supabase SQL Editor

-- 1. Agregar la columna daily_product_id
ALTER TABLE order_items 
ADD COLUMN daily_product_id UUID REFERENCES daily_products(id);

-- 2. Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('product_id', 'daily_product_id')
ORDER BY column_name;

-- 3. Opcional: Agregar índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_order_items_daily_product_id 
ON order_items(daily_product_id);

-- 4. Verificar estructura final (reemplazando \d con consulta SQL estándar)
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'order_items'
ORDER BY ordinal_position;
