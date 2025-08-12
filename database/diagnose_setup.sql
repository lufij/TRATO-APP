-- =====================================================
-- DIAGNOSTIC SCRIPT FOR DELIVERYAPP
-- =====================================================
-- Execute this script to diagnose current Supabase setup status

-- Check if UUID extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')
    THEN '✅ UUID extension is enabled'
    ELSE '❌ UUID extension is missing - run fix_setup.sql'
  END as uuid_extension_status;

-- Check if tables exist
WITH expected_tables AS (
  SELECT unnest(ARRAY['users', 'sellers', 'drivers', 'products', 'cart_items', 'orders', 'order_items', 'reviews']) as table_name
),
existing_tables AS (
  SELECT tablename as table_name
  FROM pg_tables 
  WHERE schemaname = 'public'
)
SELECT 
  et.table_name,
  CASE 
    WHEN ext.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY et.table_name;

-- Check RLS status
SELECT 
  c.relname as table_name,
  CASE 
    WHEN c.relrowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('users', 'sellers', 'drivers', 'products', 'cart_items', 'orders', 'order_items', 'reviews')
ORDER BY c.relname;

-- Check storage buckets
WITH expected_buckets AS (
  SELECT unnest(ARRAY['products', 'avatars', 'business-logos']) as bucket_name
),
existing_buckets AS (
  SELECT name as bucket_name
  FROM storage.buckets
)
SELECT 
  eb.bucket_name,
  CASE 
    WHEN ex.bucket_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_buckets eb
LEFT JOIN existing_buckets ex ON eb.bucket_name = ex.bucket_name
ORDER BY eb.bucket_name;

-- Check if there are any users in the system
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ ', COUNT(*), ' users found in system')
    ELSE '⚠️  No users found - database ready for first registration'
  END as users_status
FROM public.users;

-- Check authentication settings (this will show current auth config)
-- Note: This requires viewing Supabase dashboard manually

-- Overall status summary
WITH 
table_count AS (
  SELECT COUNT(*) as count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('users', 'sellers', 'drivers', 'products', 'cart_items', 'orders', 'order_items', 'reviews')
),
bucket_count AS (
  SELECT COUNT(*) as count
  FROM storage.buckets 
  WHERE id IN ('products', 'avatars', 'business-logos')
),
rls_count AS (
  SELECT COUNT(*) as count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' 
    AND c.relname IN ('users', 'sellers', 'drivers', 'products', 'cart_items', 'orders', 'order_items', 'reviews')
    AND c.relrowsecurity = true
)
SELECT 
  CASE 
    WHEN tc.count = 8 AND bc.count = 3 AND rc.count = 8 
    THEN '✅ SETUP IS COMPLETE - Ready to use!'
    ELSE '❌ SETUP IS INCOMPLETE - Run fix_setup.sql'
  END as overall_status,
  CONCAT(tc.count, '/8 tables') as tables_status,
  CONCAT(bc.count, '/3 buckets') as buckets_status,
  CONCAT(rc.count, '/8 RLS policies') as rls_status
FROM table_count tc, bucket_count bc, rls_count rc;

-- Instructions
SELECT '📋 INSTRUCTIONS:' as instructions;
SELECT 'If you see any ❌ status above, execute fix_setup.sql in Supabase SQL Editor' as instruction_1;
SELECT 'Make sure to disable "Enable email confirmations" in Authentication > Settings' as instruction_2;
SELECT 'Restart your app with npm run dev after running the fix' as instruction_3;