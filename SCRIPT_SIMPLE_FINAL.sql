-- 🎯 SCRIPT ULTRA SIMPLE - SI EL ANTERIOR DA ERROR
-- Ejecuta estas líneas UNA POR UNA en Supabase SQL Editor

-- Agregar columnas una por una
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS business_logo TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN DEFAULT TRUE;

-- Crear buckets básicos
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('business-logos', 'business-logos', true, 52428800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('business-covers', 'business-covers', true, 52428800)
ON CONFLICT (id) DO NOTHING;
