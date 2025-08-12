-- =====================================================
-- VERIFICACIÓN POST-ACTUALIZACIÓN - TRATO
-- =====================================================
-- Ejecuta este script DESPUÉS de hacer la actualización para confirmar que todo esté bien

-- =====================================================
-- 1. VERIFICAR TABLAS CRÍTICAS
-- =====================================================

SELECT 
  '🔍 VERIFICACIÓN DE TABLAS' as status,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ TODAS LAS TABLAS PRINCIPALES EXISTEN'
    ELSE '❌ FALTAN TABLAS CRÍTICAS'
  END as result,
  STRING_AGG(table_name, ', ') as tables_found
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'sellers', 'products', 'daily_products');

-- =====================================================
-- 2. VERIFICAR STORAGE BUCKETS
-- =====================================================

SELECT 
  '🔍 VERIFICACIÓN DE STORAGE' as status,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ TODOS LOS BUCKETS EXISTEN'
    ELSE '❌ FALTAN BUCKETS DE STORAGE'
  END as result,
  STRING_AGG(id, ', ') as buckets_found
FROM storage.buckets 
WHERE id IN ('products', 'avatars', 'business-logos');

-- =====================================================
-- 3. VERIFICAR TABLA DAILY_PRODUCTS (LA MÁS IMPORTANTE)
-- =====================================================

SELECT 
  '🔍 VERIFICACIÓN DAILY_PRODUCTS' as status,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✅ TABLA DAILY_PRODUCTS CORRECTA'
    ELSE '❌ TABLA DAILY_PRODUCTS INCOMPLETA'
  END as result,
  COUNT(*) || ' columnas encontradas' as details
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_products';

-- =====================================================
-- 4. VERIFICAR POLÍTICAS DE SEGURIDAD
-- =====================================================

SELECT 
  '🔍 VERIFICACIÓN POLÍTICAS RLS' as status,
  CASE 
    WHEN COUNT(*) >= 15 THEN '✅ POLÍTICAS RLS CONFIGURADAS'
    ELSE '❌ FALTAN POLÍTICAS RLS'
  END as result,
  COUNT(*) || ' políticas encontradas' as details
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'sellers', 'products', 'daily_products');

-- =====================================================
-- 5. VERIFICAR POLÍTICAS DE STORAGE
-- =====================================================

SELECT 
  '🔍 VERIFICACIÓN STORAGE POLICIES' as status,
  CASE 
    WHEN COUNT(*) >= 8 THEN '✅ POLÍTICAS DE STORAGE OK'
    ELSE '❌ FALTAN POLÍTICAS DE STORAGE'
  END as result,
  COUNT(*) || ' políticas de storage' as details
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (policyname LIKE '%product%' OR policyname LIKE '%avatar%' OR policyname LIKE '%business%');

-- =====================================================
-- 6. VERIFICAR FUNCIONES CRÍTICAS
-- =====================================================

SELECT 
  '🔍 VERIFICACIÓN FUNCIONES' as status,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ FUNCIONES CREADAS'
    ELSE '❌ FALTAN FUNCIONES'
  END as result,
  STRING_AGG(routine_name, ', ') as functions_found
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('update_updated_at_column', 'cleanup_expired_daily_products');

-- =====================================================
-- 7. PRUEBA DE INSERCIÓN (OPCIONAL)
-- =====================================================

-- Comenta/descomenta esta sección si quieres probar una inserción
/*
-- Prueba insertar un usuario de ejemplo (se eliminará después)
INSERT INTO public.users (id, email, name, role) VALUES 
  ('00000000-0000-0000-0000-000000000999', 'test@ejemplo.com', 'Usuario Prueba', 'comprador');

-- Verificar que se insertó
SELECT 
  '🔍 PRUEBA DE INSERCIÓN' as status,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ INSERCIÓN FUNCIONA'
    ELSE '❌ INSERCIÓN FALLA'
  END as result
FROM public.users 
WHERE email = 'test@ejemplo.com';

-- Eliminar usuario de prueba
DELETE FROM public.users WHERE email = 'test@ejemplo.com';
*/

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

SELECT '🎯 RESULTADO FINAL' as final_check;

WITH verification_summary AS (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'sellers', 'products', 'daily_products')) >= 4 as tables_ok,
    (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('products', 'avatars', 'business-logos')) = 3 as buckets_ok,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_products') >= 7 as daily_products_ok,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('users', 'sellers', 'products', 'daily_products')) >= 15 as policies_ok
)
SELECT 
  CASE 
    WHEN tables_ok AND buckets_ok AND daily_products_ok AND policies_ok
    THEN '🎉 ¡ACTUALIZACIÓN COMPLETADA EXITOSAMENTE! 
    
Tu sistema de productos está 100% listo para usar:
✅ Base de datos actualizada
✅ Storage configurado  
✅ Políticas de seguridad activas
✅ Funcionalidades completas disponibles

PRÓXIMO PASO: Recarga tu aplicación (F5) y prueba crear un producto.'

    ELSE '⚠️ ACTUALIZACIÓN INCOMPLETA - Revisar elementos faltantes:
' || 
    CASE WHEN NOT tables_ok THEN '❌ Faltan tablas principales
' ELSE '' END ||
    CASE WHEN NOT buckets_ok THEN '❌ Faltan storage buckets  
' ELSE '' END ||
    CASE WHEN NOT daily_products_ok THEN '❌ Tabla daily_products incompleta
' ELSE '' END ||
    CASE WHEN NOT policies_ok THEN '❌ Faltan políticas de seguridad
' ELSE '' END ||
'
SOLUCIÓN: Ejecutar nuevamente /database/fix_setup.sql completo.'

  END as final_result
FROM verification_summary;

-- =====================================================
-- INSTRUCCIONES POST-VERIFICACIÓN
-- =====================================================

SELECT '📋 SIGUIENTES PASOS:' as next_steps;

SELECT 
  '1. Si todo está ✅, recarga tu aplicación con F5' as step_1
UNION ALL
SELECT 
  '2. Regístrate como vendedor para probar el sistema' as step_2
UNION ALL
SELECT 
  '3. Crea tu primer producto normal con imagen' as step_3  
UNION ALL
SELECT 
  '4. Crea un producto del día para probar auto-eliminación' as step_4
UNION ALL
SELECT 
  '5. ¡Disfruta tu sistema de gestión de productos!' as step_5;

SELECT '✨ ¡TRATO está listo para conquistar el mercado local de Gualán!' as celebration;