-- =====================================================
-- EMERGENCY CLEANUP SCRIPT - TRATO
-- =====================================================
-- Execute this script ONLY if fix_setup.sql keeps failing with policy errors
-- This will clean up all existing policies and buckets before running the main setup

-- =====================================================
-- STEP 1: CLEAN ALL STORAGE POLICIES
-- =====================================================

-- Remove all storage policies for our buckets
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all storage policies
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%product%' OR 
            policyname LIKE '%avatar%' OR 
            policyname LIKE '%business%' OR
            policyname LIKE '%Public product images%' OR
            policyname LIKE '%Public avatars%' OR
            policyname LIKE '%Public business logos%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE 'Dropped storage policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'All storage policies cleaned up successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error cleaning storage policies: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 2: CLEAN ALL STORAGE BUCKETS
-- =====================================================

-- Remove all objects from our buckets first
DO $$
BEGIN
    DELETE FROM storage.objects WHERE bucket_id IN ('products', 'avatars', 'business-logos');
    RAISE NOTICE 'Storage objects deleted';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting storage objects: %', SQLERRM;
END $$;

-- Remove the buckets
DO $$
BEGIN
    DELETE FROM storage.buckets WHERE id IN ('products', 'avatars', 'business-logos');
    RAISE NOTICE 'Storage buckets deleted';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting storage buckets: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 3: CLEAN ALL TABLE POLICIES
-- =====================================================

-- Remove all RLS policies from our tables
DO $$
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    FOR table_name IN VALUES ('users'), ('sellers'), ('drivers'), ('products'), ('cart_items'), ('orders'), ('order_items'), ('reviews')
    LOOP
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
            RAISE NOTICE 'Dropped table policy: % on %', policy_record.policyname, table_name;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'All table policies cleaned up successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error cleaning table policies: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 4: CLEAN ALL TRIGGERS
-- =====================================================

DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
    DROP TRIGGER IF EXISTS update_sellers_updated_at ON public.sellers;
    DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
    DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
    DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
    
    DROP FUNCTION IF EXISTS update_updated_at_column();
    
    RAISE NOTICE 'All triggers and functions cleaned up successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error cleaning triggers: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 5: CLEAN ALL TABLES
-- =====================================================

-- Drop all tables in correct order
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.sellers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify cleanup
SELECT 'CLEANUP COMPLETED!' as status;

SELECT 
  'Remaining tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'sellers', 'drivers', 'products', 'cart_items', 'orders', 'order_items', 'reviews');

SELECT 
  'Remaining storage buckets' as check_type,
  COUNT(*) as count
FROM storage.buckets 
WHERE id IN ('products', 'avatars', 'business-logos');

SELECT 
  'Remaining storage policies' as check_type,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
      policyname LIKE '%product%' OR 
      policyname LIKE '%avatar%' OR 
      policyname LIKE '%business%'
  );

-- Final instructions
SELECT '✅ EMERGENCY CLEANUP COMPLETED!' as final_status;
SELECT 'Now you can safely run fix_setup.sql again' as next_action;