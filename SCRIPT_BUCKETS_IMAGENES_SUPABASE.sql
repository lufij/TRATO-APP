-- SCRIPT PARA CREAR BUCKETS DE IMÁGENES EN SUPABASE
-- Ejecutar este script en Supabase SQL Editor para asegurar que existan los buckets

-- Crear bucket para logos de negocios si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos', 
  true,
  52428800, -- 50MB para permitir cualquier imagen
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/bmp']
)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket para portadas de negocios si no existe  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-covers',
  'business-covers',
  true, 
  52428800, -- 50MB para permitir cualquier imagen
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/bmp']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir subir logos (solo el propietario)
CREATE POLICY "Users can upload their own business logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir ver logos públicamente
CREATE POLICY "Business logos are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'business-logos');

-- Política para permitir actualizar logos (solo el propietario)
CREATE POLICY "Users can update their own business logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir eliminar logos (solo el propietario)
CREATE POLICY "Users can delete their own business logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir subir portadas (solo el propietario)
CREATE POLICY "Users can upload their own business covers" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir ver portadas públicamente
CREATE POLICY "Business covers are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'business-covers');

-- Política para permitir actualizar portadas (solo el propietario) 
CREATE POLICY "Users can update their own business covers" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir eliminar portadas (solo el propietario)
CREATE POLICY "Users can delete their own business covers" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verificar que los buckets se crearon correctamente
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('business-logos', 'business-covers');
