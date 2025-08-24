-- Agrega la columna delivery_time a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50);
