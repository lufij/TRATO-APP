-- =====================================================
-- CONFIGURAR NOTIFICACIONES PARA MÓVILES - SQL
-- =====================================================
-- Este script optimiza la configuración para dispositivos móviles
-- Ejecutar en: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql

-- PASO 1: Configurar publicación para máxima compatibilidad
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR TABLE orders;

-- PASO 2: Asegurar que orders tenga configuración completa para móviles
ALTER TABLE orders REPLICA IDENTITY FULL;

-- PASO 3: Política optimizada para notificaciones móviles
DROP POLICY IF EXISTS "Mobile optimized notifications" ON orders;
CREATE POLICY "Mobile optimized notifications" ON orders
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      buyer_id = auth.uid() OR 
      seller_id = auth.uid() OR
      driver_id = auth.uid()
    )
  );

-- PASO 4: Función para verificar notificaciones móviles
CREATE OR REPLACE FUNCTION public.test_mobile_notifications(seller_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  test_order_id UUID;
BEGIN
  -- Crear orden de prueba específica para móviles
  INSERT INTO orders (
    buyer_id,
    seller_id, 
    total,
    status,
    notes,
    created_at
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    seller_id_param,
    35.75,
    'pending',
    'ORDEN DE PRUEBA MÓVIL - ' || NOW() || ' - Cliente: María García - Tel: +502 4000-1234',
    NOW()
  )
  RETURNING id INTO test_order_id;
  
  -- Construir respuesta JSON
  SELECT json_build_object(
    'success', true,
    'message', 'Orden de prueba móvil creada',
    'order_id', test_order_id,
    'timestamp', NOW(),
    'instructions', json_build_array(
      'La notificación debe aparecer en 1-3 segundos',
      'Debe sonar un tono de campana',
      'En móviles: revisa permisos de la app en Configuración',
      'Android: Configuración > Apps > Chrome/navegador > Notificaciones',
      'iPhone: Configuración > Safari > Notificaciones',
      'Permite sonidos y ventanas emergentes'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- PASO 5: Verificación del sistema
SELECT 
  'ESTADO DEL SISTEMA MÓVIL' as seccion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN 'REALTIME CONFIGURADO ✅'
    ELSE 'REALTIME ERROR ❌'
  END as realtime_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'orders' 
      AND policyname ILIKE '%mobile%'
    ) THEN 'POLÍTICAS MÓVILES OK ✅'
    ELSE 'POLÍTICAS PENDIENTES ⚠️'
  END as mobile_policies;

-- PASO 6: Información de uso
SELECT 
  'INSTRUCCIONES PARA PROBAR' as titulo,
  'Ejecuta en el navegador:' as paso_1,
  'SELECT test_mobile_notifications(''TU_SELLER_ID_AQUÍ'');' as comando,
  '' as espacio,
  'PERMISOS IMPORTANTES:' as paso_2,
  json_build_array(
    'Android Chrome: Configuración > Sitios web > Notificaciones > Permitir',
    'Android Firefox: Configuración > Privacidad > Permisos > Notificaciones',
    'iPhone Safari: Configuración > Safari > Notificaciones > Permitir',
    'Asegúrate de que el sonido del dispositivo esté activado',
    'En modo silencio, las notificaciones pueden no sonar',
    'Prueba con el dispositivo desbloqueado primero'
  ) as permisos_mobiles;
