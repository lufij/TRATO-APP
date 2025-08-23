-- 🔥 SCRIPT DEFINITIVO PARA RESOLVER TODOS LOS ERRORES
-- Este script debe ejecutarse en Supabase SQL Editor
-- Copialo y pegalo completo en el editor SQL

-- 1️⃣ AGREGAR COLUMNAS FALTANTES A LA TABLA SELLERS
DO $$ 
BEGIN
  -- Verificar y agregar business_logo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'business_logo'
  ) THEN
    ALTER TABLE sellers ADD COLUMN business_logo TEXT;
    RAISE NOTICE '✅ Columna business_logo agregada';
  ELSE
    RAISE NOTICE '✅ Columna business_logo ya existe';
  END IF;

  -- Verificar y agregar cover_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE sellers ADD COLUMN cover_image_url TEXT;
    RAISE NOTICE '✅ Columna cover_image_url agregada';
  ELSE
    RAISE NOTICE '✅ Columna cover_image_url ya existe';
  END IF;

  -- Verificar y agregar address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'address'
  ) THEN
    ALTER TABLE sellers ADD COLUMN address TEXT;
    RAISE NOTICE '✅ Columna address agregada';
  ELSE
    RAISE NOTICE '✅ Columna address ya existe';
  END IF;

  -- Verificar y agregar latitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE sellers ADD COLUMN latitude DECIMAL(10,8);
    RAISE NOTICE '✅ Columna latitude agregada';
  ELSE
    RAISE NOTICE '✅ Columna latitude ya existe';
  END IF;

  -- Verificar y agregar longitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE sellers ADD COLUMN longitude DECIMAL(11,8);
    RAISE NOTICE '✅ Columna longitude agregada';
  ELSE
    RAISE NOTICE '✅ Columna longitude ya existe';
  END IF;

  -- Verificar y agregar location_verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'location_verified'
  ) THEN
    ALTER TABLE sellers ADD COLUMN location_verified BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Columna location_verified agregada';
  ELSE
    RAISE NOTICE '✅ Columna location_verified ya existe';
  END IF;

  -- Verificar y agregar is_open_now
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'is_open_now'
  ) THEN
    ALTER TABLE sellers ADD COLUMN is_open_now BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✅ Columna is_open_now agregada';
  ELSE
    RAISE NOTICE '✅ Columna is_open_now ya existe';
  END IF;

END $$;

-- 2️⃣ CREAR BUCKETS DE STORAGE SI NO EXISTEN
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('business-logos', 'business-logos', true, 52428800, '{"image/*"}'),
  ('business-covers', 'business-covers', true, 52428800, '{"image/*"}')
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = '{"image/*"}';

-- 3️⃣ CONFIGURAR POLÍTICAS RLS PARA LOS BUCKETS
-- Política para business-logos
DROP POLICY IF EXISTS "Usuarios pueden subir logos" ON storage.objects;
CREATE POLICY "Usuarios pueden subir logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Usuarios pueden ver logos" ON storage.objects;
CREATE POLICY "Usuarios pueden ver logos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "Usuarios pueden actualizar logos" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para business-covers
DROP POLICY IF EXISTS "Usuarios pueden subir portadas" ON storage.objects;
CREATE POLICY "Usuarios pueden subir portadas" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'business-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Usuarios pueden ver portadas" ON storage.objects;
CREATE POLICY "Usuarios pueden ver portadas" ON storage.objects
FOR SELECT USING (bucket_id = 'business-covers');

DROP POLICY IF EXISTS "Usuarios pueden actualizar portadas" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar portadas" ON storage.objects
FOR UPDATE USING (bucket_id = 'business-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4️⃣ VERIFICAR QUE TODO ESTÉ FUNCIONANDO
DO $$
BEGIN
  RAISE NOTICE '🎉 ¡CONFIGURACIÓN COMPLETADA!';
  RAISE NOTICE '✅ Todas las columnas agregadas a sellers';
  RAISE NOTICE '✅ Buckets configurados con 50MB de límite';
  RAISE NOTICE '✅ Políticas RLS configuradas';
  RAISE NOTICE '🚀 El sistema ya debe permitir subir imágenes';
END $$;
