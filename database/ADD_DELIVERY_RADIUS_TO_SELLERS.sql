-- Agrega la columna delivery_radius a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS delivery_radius NUMERIC;
