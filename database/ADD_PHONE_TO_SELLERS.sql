-- Agrega la columna phone a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
