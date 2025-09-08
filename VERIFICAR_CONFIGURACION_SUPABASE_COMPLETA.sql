-- =====================================================
-- VERIFICAR CONFIGURACIÓN COMPLETA SUPABASE
-- =====================================================
-- EJECUTAR EN: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- PASO 1: VERIFICAR REALTIME HABILITADO
SELECT 
  'REALTIME CONFIGURATION' as seccion,
  n.nspname as schemaname,
  c.relname as tablename,
  CASE 
    WHEN c.relreplident = 'f' THEN '✅ FULL (Correcto)' 
    WHEN c.relreplident = 'd' THEN '⚠️ DEFAULT (Necesita cambio)'
    ELSE '❌ NO CONFIGURED' 
  END as replica_identity_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('orders', 'users', 'products', 'daily_products')
  AND n.nspname = 'public';

-- PASO 2: VERIFICAR PUBLICACIÓN REALTIME
SELECT 
  'REALTIME PUBLICATION' as seccion,
  pubname as publication_name,
  tablename,
  '✅ Tabla incluida en Realtime' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('orders', 'users', 'products', 'daily_products')
UNION ALL
SELECT 
  'REALTIME PUBLICATION' as seccion,
  'supabase_realtime' as publication_name,
  'MISSING TABLES' as tablename,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime') = 0 
    THEN '❌ Publicación no configurada'
    ELSE '⚠️ Faltan tablas'
  END as status
WHERE NOT EXISTS (
  SELECT 1 FROM pg_publication_tables 
  WHERE pubname = 'supabase_realtime' 
    AND tablename IN ('orders', 'users', 'products', 'daily_products')
);

-- PASO 3: VERIFICAR POLÍTICAS RLS
SELECT 
  'RLS POLICIES' as seccion,
  t.schemaname || '.' || t.tablename as table_name,
  CASE WHEN t.rowsecurity THEN '✅ RLS Habilitado' ELSE '❌ RLS Deshabilitado' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE t.tablename IN ('orders', 'users', 'products', 'daily_products')
  AND t.schemaname = 'public';

-- PASO 4: VERIFICAR POLÍTICAS ESPECÍFICAS
SELECT 
  'SPECIFIC POLICIES' as seccion,
  p.schemaname || '.' || p.tablename as table_name,
  p.policyname as policy_name,
  p.cmd as command_type,
  '✅ Política activa' as status
FROM pg_policies p
WHERE p.tablename IN ('orders', 'users')
  AND p.schemaname = 'public';

-- PASO 5: VERIFICAR FUNCIÓN DE NOTIFICACIÓN
SELECT 
  'NOTIFICATION FUNCTION' as seccion,
  proname as function_name,
  CASE 
    WHEN proname = 'notify_seller_new_order' THEN '✅ Función de notificación existe'
    ELSE '✅ Función encontrada'
  END as status
FROM pg_proc 
WHERE proname LIKE '%notify%' OR proname LIKE '%order%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- PASO 6: VERIFICAR TRIGGERS
SELECT 
  'TRIGGERS' as seccion,
  trg.event_object_schema || '.' || trg.event_object_table as table_name,
  trg.trigger_name,
  '✅ Trigger activo' as status
FROM information_schema.triggers trg
WHERE trg.event_object_table = 'orders' 
  AND trg.event_object_schema = 'public'
  AND trg.trigger_name LIKE '%notify%';

-- PASO 7: VERIFICAR CONEXIÓN SUPABASE AUTH
SELECT 
  'AUTH CONNECTION' as seccion,
  'auth.users' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN '✅ Auth funcionando'
    ELSE '⚠️ Sin usuarios registrados'
  END as status;

-- PASO 8: VERIFICAR DATOS DE PRUEBA
SELECT 
  'DATA CHECK' as seccion,
  'orders' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tiene datos para probar'
    ELSE '⚠️ Sin datos (crear orden de prueba)'
  END as status
FROM orders
UNION ALL
SELECT 
  'DATA CHECK' as seccion,
  'users' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tiene usuarios'
    ELSE '❌ Sin usuarios registrados'
  END as status
FROM users;

-- PASO 9: RESUMEN FINAL
SELECT 
  '🎯 CONFIGURATION SUMMARY' as seccion,
  'Status' as item,
  CASE 
    WHEN (
      -- Verificar que orders tenga REPLICA IDENTITY FULL
      SELECT c.relreplident FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = 'orders' AND n.nspname = 'public'
    ) = 'f'
    AND EXISTS (
      -- Verificar publicación realtime
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    )
    AND (
      -- Verificar RLS en orders
      SELECT t.rowsecurity FROM pg_tables t
      WHERE t.tablename = 'orders' AND t.schemaname = 'public'
    ) = true
    THEN '✅ CONFIGURACIÓN COMPLETA - Listo para notificaciones'
    ELSE '❌ FALTA CONFIGURACIÓN - Revisar pasos anteriores'
  END as result;

-- PASO 10: INSTRUCCIONES FINALES
SELECT 
  '📋 NEXT STEPS' as seccion,
  'Instrucciones' as item,
  'Si ves ✅ CONFIGURACIÓN COMPLETA, crea una orden de prueba y verifica que llegue la notificación con sonido al vendedor' as instruction;
