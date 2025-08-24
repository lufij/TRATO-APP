-- Agrega la columna business_hours a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS business_hours VARCHAR(100);
