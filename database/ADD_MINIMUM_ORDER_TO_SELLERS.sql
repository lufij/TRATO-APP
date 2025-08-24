-- Agrega la columna minimum_order a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS minimum_order NUMERIC;
