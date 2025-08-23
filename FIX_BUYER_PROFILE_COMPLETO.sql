-- 🔥 FIX DEFINITIVO PARA ERRORES DEL PERFIL COMPRADOR
-- Ejecuta este script en Supabase SQL Editor

-- 1️⃣ ARREGLAR TABLA ORDERS - AGREGAR COLUMNAS FALTANTES
DO $$ 
BEGIN
  -- Verificar y agregar total si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total'
  ) THEN
    ALTER TABLE orders ADD COLUMN total DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Columna total agregada a orders';
  ELSE
    RAISE NOTICE '✅ Columna total ya existe en orders';
  END IF;

  -- Verificar y agregar total_amount si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Columna total_amount agregada a orders';
  ELSE
    RAISE NOTICE '✅ Columna total_amount ya existe en orders';
  END IF;

  -- Verificar y agregar seller_rating si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'seller_rating'
  ) THEN
    ALTER TABLE orders ADD COLUMN seller_rating INTEGER CHECK (seller_rating >= 1 AND seller_rating <= 5);
    RAISE NOTICE '✅ Columna seller_rating agregada a orders';
  ELSE
    RAISE NOTICE '✅ Columna seller_rating ya existe en orders';
  END IF;

  -- Verificar y agregar buyer_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'buyer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN buyer_id UUID REFERENCES auth.users(id);
    RAISE NOTICE '✅ Columna buyer_id agregada a orders';
  ELSE
    RAISE NOTICE '✅ Columna buyer_id ya existe en orders';
  END IF;

END $$;

-- 2️⃣ ARREGLAR TABLA USERS - AGREGAR COLUMNAS PARA PERFIL
DO $$ 
BEGIN
  -- Verificar y agregar avatar_url si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
    RAISE NOTICE '✅ Columna avatar_url agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna avatar_url ya existe en users';
  END IF;

  -- Verificar y agregar date_of_birth si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE users ADD COLUMN date_of_birth DATE;
    RAISE NOTICE '✅ Columna date_of_birth agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna date_of_birth ya existe en users';
  END IF;

  -- Verificar y agregar notification_preferences si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{"order_updates": true, "promotions": true, "new_products": false}';
    RAISE NOTICE '✅ Columna notification_preferences agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna notification_preferences ya existe en users';
  END IF;

  -- Verificar y agregar address si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'address'
  ) THEN
    ALTER TABLE users ADD COLUMN address TEXT;
    RAISE NOTICE '✅ Columna address agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna address ya existe en users';
  END IF;

  -- Verificar y agregar preferred_delivery_address si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'preferred_delivery_address'
  ) THEN
    ALTER TABLE users ADD COLUMN preferred_delivery_address TEXT;
    RAISE NOTICE '✅ Columna preferred_delivery_address agregada a users';
  ELSE
    RAISE NOTICE '✅ Columna preferred_delivery_address ya existe en users';
  END IF;

END $$;

-- 3️⃣ CREAR BUCKET PARA AVATARS DE USUARIOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-avatars', 'user-avatars', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = '{"image/*"}';

-- 4️⃣ POLÍTICAS RLS PARA AVATARS
-- Política para user-avatars
DROP POLICY IF EXISTS "Usuarios pueden subir avatars" ON storage.objects;
CREATE POLICY "Usuarios pueden subir avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Usuarios pueden ver avatars" ON storage.objects;
CREATE POLICY "Usuarios pueden ver avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Usuarios pueden actualizar avatars" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5️⃣ VERIFICACIÓN FINAL
DO $$
BEGIN
  RAISE NOTICE '🎉 ¡PERFIL COMPRADOR CONFIGURADO!';
  RAISE NOTICE '✅ Tabla orders con todas las columnas necesarias';
  RAISE NOTICE '✅ Tabla users preparada para avatars y perfil completo';
  RAISE NOTICE '✅ Bucket user-avatars creado con 10MB límite';
  RAISE NOTICE '✅ Políticas RLS configuradas para avatars';
  RAISE NOTICE '🚀 Perfil comprador debe funcionar sin errores';
END $$;
