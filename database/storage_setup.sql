-- TRATO App - Storage setup (idempotent)
-- Creates required buckets and sane public-read/authenticated-write policies

DO $$
BEGIN
  -- Create buckets if not exist
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'products') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'business-logos') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true);
  END IF;
END $$;

-- Reset conflicting policies (safe if not present)
DROP POLICY IF EXISTS "Public product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their product images" ON storage.objects;

DROP POLICY IF EXISTS "Public avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatars" ON storage.objects;

DROP POLICY IF EXISTS "Public business logos" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload business logos" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update their business logos" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their business logos" ON storage.objects;

-- Products: public read, authenticated write limited to own folder
CREATE POLICY "Public product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Sellers can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Sellers can update their product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sellers can delete their product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars: public read, authenticated user manages own avatar folder
CREATE POLICY "Public avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Business logos: public read, authenticated seller manages own folder
CREATE POLICY "Public business logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-logos');

CREATE POLICY "Sellers can upload business logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Sellers can update their business logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sellers can delete their business logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verification helpers (optional)
-- SELECT id, name, public FROM storage.buckets ORDER BY name;
-- SELECT policyname, schemaname, tablename FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
