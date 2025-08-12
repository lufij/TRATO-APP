-- =====================================================
-- VERIFICACIÓN DEL SISTEMA DE PRODUCTOS - TRATO
-- =====================================================
-- Ejecuta este script para verificar que todo esté configurado correctamente

-- =====================================================
-- VERIFICACIÓN 1: TABLAS REQUERIDAS
-- =====================================================

SELECT 
  'VERIFICACIÓN DE TABLAS' as check_type,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ TODAS LAS TABLAS EXISTEN'
    ELSE '❌ FALTAN TABLAS: ' || (5 - COUNT(*))::text
  END as status,
  COUNT(*) as found_tables,
  5 as required_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'sellers', 'products', 'daily_products', 'cart_items');

-- Lista de tablas encontradas
SELECT 
  '📋 Tablas encontradas:' as info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'sellers', 'products', 'daily_products', 'cart_items', 'orders', 'order_items', 'reviews')
ORDER BY table_name;

-- =====================================================
-- VERIFICACIÓN 2: ESTRUCTURA DE DAILY_PRODUCTS
-- =====================================================

SELECT 
  'VERIFICACIÓN DAILY_PRODUCTS' as check_type,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✅ TABLA DAILY_PRODUCTS CORRECTA'
    ELSE '❌ TABLA DAILY_PRODUCTS INCOMPLETA'
  END as status,
  COUNT(*) as found_columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_products';

-- Columnas de daily_products
SELECT 
  '📋 Columnas de daily_products:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_products'
ORDER BY ordinal_position;

-- =====================================================
-- VERIFICACIÓN 3: POLÍTICAS RLS
-- =====================================================

SELECT 
  'VERIFICACIÓN DE POLÍTICAS RLS' as check_type,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ POLÍTICAS RLS CONFIGURADAS'
    ELSE '❌ FALTAN POLÍTICAS RLS'
  END as status,
  COUNT(*) as found_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'sellers', 'products', 'daily_products', 'cart_items');

-- Lista de políticas por tabla
SELECT 
  '📋 Políticas por tabla:' as info,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'sellers', 'products', 'daily_products', 'cart_items')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- VERIFICACIÓN 4: STORAGE BUCKETS
-- =====================================================

SELECT 
  'VERIFICACIÓN DE STORAGE' as check_type,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ TODOS LOS BUCKETS EXISTEN'
    ELSE '❌ FALTAN BUCKETS DE STORAGE'
  END as status,
  COUNT(*) as found_buckets,
  3 as required_buckets
FROM storage.buckets 
WHERE id IN ('products', 'avatars', 'business-logos');

-- Lista de buckets
SELECT 
  '📋 Storage buckets encontrados:' as info,
  id as bucket_name,
  public,
  file_size_limit / 1024 / 1024 as max_size_mb
FROM storage.buckets 
WHERE id IN ('products', 'avatars', 'business-logos')
ORDER BY id;

-- =====================================================
-- VERIFICACIÓN 5: POLÍTICAS DE STORAGE
-- =====================================================

SELECT 
  'VERIFICACIÓN POLÍTICAS STORAGE' as check_type,
  CASE 
    WHEN COUNT(*) >= 12 THEN '✅ POLÍTICAS DE STORAGE CORRECTAS'
    ELSE '❌ FALTAN POLÍTICAS DE STORAGE'
  END as status,
  COUNT(*) as found_storage_policies
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Lista de políticas de storage
SELECT 
  '📋 Políticas de storage:' as info,
  policyname
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE '%product%' OR 
    policyname LIKE '%avatar%' OR 
    policyname LIKE '%business%'
  )
ORDER BY policyname;

-- =====================================================
-- VERIFICACIÓN 6: FUNCIONES Y TRIGGERS
-- =====================================================

SELECT 
  'VERIFICACIÓN DE FUNCIONES' as check_type,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ FUNCIONES CREADAS'
    ELSE '❌ FALTAN FUNCIONES'
  END as status,
  COUNT(*) as found_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('update_updated_at_column', 'cleanup_expired_daily_products');

-- Lista de funciones
SELECT 
  '📋 Funciones encontradas:' as info,
  routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('update_updated_at_column', 'cleanup_expired_daily_products');

-- =====================================================
-- VERIFICACIÓN 7: DATOS DE PRUEBA
-- =====================================================

-- Verificar si existe usuario admin
SELECT 
  'VERIFICACIÓN USUARIO ADMIN' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ USUARIO ADMIN EXISTE'
    ELSE '🔶 USUARIO ADMIN NO ENCONTRADO (normal)'
  END as status,
  COUNT(*) as admin_users
FROM public.users 
WHERE email = 'trato.app1984@gmail.com';

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

SELECT '🎯 RESUMEN DE VERIFICACIÓN' as final_check;

-- Conteo total de elementos críticos
WITH verification_counts AS (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'sellers', 'products', 'daily_products', 'cart_items')) as tables_count,
    (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('products', 'avatars', 'business-logos')) as buckets_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('users', 'sellers', 'products', 'daily_products', 'cart_items')) as rls_policies_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') as storage_policies_count
)
SELECT 
  CASE 
    WHEN tables_count = 5 AND buckets_count = 3 AND rls_policies_count >= 20 AND storage_policies_count >= 12 
    THEN '🎉 ¡CONFIGURACIÓN COMPLETA! El sistema de productos está listo para usar.'
    ELSE '⚠️ CONFIGURACIÓN INCOMPLETA. Revisar elementos faltantes arriba.'
  END as final_status,
  tables_count || '/5 tablas' as tables_status,
  buckets_count || '/3 buckets' as buckets_status,
  rls_policies_count || '/20+ políticas RLS' as rls_status,
  storage_policies_count || '/12+ políticas storage' as storage_status
FROM verification_counts;

-- =====================================================
-- INSTRUCCIONES SIGUIENTES
-- =====================================================

SELECT '📋 PRÓXIMOS PASOS:' as next_steps;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_products') = 0
    THEN '1. ❌ EJECUTAR: /database/fix_setup.sql (tabla daily_products faltante)'
    WHEN (SELECT COUNT(*) FROM storage.buckets WHERE id = 'products') = 0
    THEN '2. ❌ CREAR: Storage buckets en Supabase Dashboard'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') < 12
    THEN '3. ❌ EJECUTAR: Script completo (faltan políticas de storage)'
    ELSE '4. ✅ IR A: Authentication → Settings → Desactivar email confirmations'
  END as action_needed;

SELECT 
  '5. ✅ PROBAR: Registrar vendedor y crear producto de prueba' as final_test;

SELECT 
  '6. 🎉 DISFRUTAR: Tu sistema de gestión de productos está listo!' as enjoy;

-- =====================================================
-- INFORMACIÓN ADICIONAL
-- =====================================================

SELECT '📊 INFORMACIÓN DEL SISTEMA:' as system_info;

SELECT 
  'Versión de la base de datos' as info_type,
  version() as details;

SELECT 
  'Zona horaria del servidor' as info_type,
  current_setting('timezone') as details;

SELECT 
  'Fecha y hora actual' as info_type,
  NOW() as details;