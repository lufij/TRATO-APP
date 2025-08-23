-- 🔧 CREAR BUCKETS DE STORAGE MANUALMENTE
-- IMPORTANTE: Ejecuta esto SOLO si los buckets no existen en Supabase Dashboard

-- Opción 1: Crear buckets usando SQL (puede requerir permisos especiales)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('business-logos', 'business-logos', true, 52428800, '{"image/*"}'),
  ('business-covers', 'business-covers', true, 52428800, '{"image/*"}'),
  ('user-avatars', 'user-avatars', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

-- Opción 2: CREAR MANUALMENTE EN DASHBOARD DE SUPABASE
-- Ve a tu Dashboard de Supabase → Storage → Create Bucket
-- 
-- Bucket 1: business-logos
-- - Public: true
-- - File size limit: 50MB (52428800 bytes)
-- - Allowed mime types: image/*
--
-- Bucket 2: business-covers  
-- - Public: true
-- - File size limit: 50MB (52428800 bytes)
-- - Allowed mime types: image/*
--
-- Bucket 3: user-avatars
-- - Public: true
-- - File size limit: 10MB (10485760 bytes)
-- - Allowed mime types: image/*
