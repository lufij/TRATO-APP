-- Agrega la columna email a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email VARCHAR(100);
