-- Agrega la columna social_media a la tabla sellers si no existe
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS social_media TEXT;
