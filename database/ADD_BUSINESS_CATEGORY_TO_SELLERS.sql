-- Agrega la columna business_category a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS business_category VARCHAR(100);
