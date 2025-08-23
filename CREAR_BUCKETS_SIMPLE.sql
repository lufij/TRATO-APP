-- 🚨 SCRIPT 2: CREAR BUCKETS DE IMÁGENES (EJECUTAR DESPUÉS DEL PRIMERO)

-- Crear buckets si no existen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('business-logos', 'business-logos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)  
VALUES ('business-covers', 'business-covers', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- Políticas básicas
DROP POLICY IF EXISTS "business_logos_select" ON storage.objects;
DROP POLICY IF EXISTS "business_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "business_covers_select" ON storage.objects;  
DROP POLICY IF EXISTS "business_covers_insert" ON storage.objects;

CREATE POLICY "business_logos_select" ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');
CREATE POLICY "business_logos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-logos');
CREATE POLICY "business_covers_select" ON storage.objects FOR SELECT USING (bucket_id = 'business-covers');
CREATE POLICY "business_covers_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-covers');

-- Verificar buckets
SELECT id, name, public FROM storage.buckets WHERE id IN ('business-logos', 'business-covers');
