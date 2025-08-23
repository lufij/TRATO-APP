-- SCRIPT PARA ACTUALIZAR BUCKETS EXISTENTES CON MAYOR CAPACIDAD
-- Ejecutar este script en Supabase SQL Editor para permitir imágenes más grandes

-- Actualizar bucket business-logos para permitir archivos de hasta 50MB
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/bmp']
WHERE id = 'business-logos';

-- Actualizar bucket business-covers para permitir archivos de hasta 50MB  
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/bmp']
WHERE id = 'business-covers';

-- Verificar que los buckets se actualizaron correctamente
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  ROUND(file_size_limit / 1048576.0, 1) AS "size_limit_mb",
  allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('business-logos', 'business-covers');

-- Mostrar mensaje de confirmación
SELECT 'Buckets actualizados para permitir imágenes de hasta 50MB' AS status;
