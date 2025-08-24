-- Agrega la columna is_active a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
