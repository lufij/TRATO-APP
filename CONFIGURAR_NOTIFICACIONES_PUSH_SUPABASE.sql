-- =====================================================
-- CONFIGURAR NOTIFICACIONES PUSH CON SONIDO - SUPABASE
-- =====================================================
-- Ejecutar en: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- 1. CREAR TABLA PARA COLA DE NOTIFICACIONES PUSH
CREATE TABLE IF NOT EXISTS push_notifications_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  type text DEFAULT 'general',
  priority integer DEFAULT 1,
  sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  sent_at timestamp with time zone,
  error_message text
);

-- Habilitar RLS
ALTER TABLE push_notifications_queue ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean sus notificaciones
CREATE POLICY "Users can view own push notifications" ON push_notifications_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Política para insertar notificaciones (sistema)
CREATE POLICY "Service can insert push notifications" ON push_notifications_queue
  FOR INSERT WITH CHECK (true);

-- Política para actualizar estado (sistema)
CREATE POLICY "Service can update push notifications" ON push_notifications_queue
  FOR UPDATE USING (true);

-- 2. CREAR FUNCIÓN PARA ENCOLAR NOTIFICACIONES
CREATE OR REPLACE FUNCTION enqueue_push_notification(
  target_user_id uuid,
  notification_title text,
  notification_body text,
  notification_data jsonb DEFAULT '{}',
  notification_type text DEFAULT 'general',
  notification_priority integer DEFAULT 1
) 
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO push_notifications_queue (
    user_id, 
    title, 
    body, 
    data, 
    type, 
    priority
  ) VALUES (
    target_user_id,
    notification_title,
    notification_body,
    notification_data,
    notification_type,
    notification_priority
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 3. CREAR TRIGGER PARA NOTIFICAR NUEVAS ÓRDENES A VENDEDORES
CREATE OR REPLACE FUNCTION notify_seller_new_order()
RETURNS TRIGGER AS $$
DECLARE
  seller_info record;
BEGIN
  -- Solo para órdenes nuevas
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    -- Obtener información del vendedor
    SELECT u.id, u.name, u.email 
    FROM auth.users u 
    WHERE u.id = NEW.seller_id 
    INTO seller_info;
    
    IF seller_info.id IS NOT NULL THEN
      -- Encolar notificación push crítica
      PERFORM enqueue_push_notification(
        seller_info.id,
        '🛒 Nueva Orden Recibida',
        format('Pedido por $%s - %s', 
               COALESCE(NEW.total::text, NEW.total_amount::text, '0'), 
               COALESCE(NEW.customer_name, 'Cliente')),
        jsonb_build_object(
          'order_id', NEW.id,
          'total', COALESCE(NEW.total, NEW.total_amount, 0),
          'customer_name', COALESCE(NEW.customer_name, 'Cliente'),
          'delivery_type', COALESCE(NEW.delivery_type, 'pickup'),
          'status', NEW.status,
          'sound', 'critical',
          'priority', 'high'
        ),
        'new_order',
        3  -- Prioridad máxima
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en tabla orders
DROP TRIGGER IF EXISTS trigger_notify_seller_new_order ON orders;
CREATE TRIGGER trigger_notify_seller_new_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_new_order();

-- 4. FUNCIÓN PARA MARCAR NOTIFICACIONES COMO ENVIADAS
CREATE OR REPLACE FUNCTION mark_push_notification_sent(
  notification_id uuid,
  success boolean DEFAULT true,
  error_msg text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE push_notifications_queue
  SET 
    sent = success,
    sent_at = timezone('utc'::text, now()),
    error_message = error_msg
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCIÓN PARA OBTENER NOTIFICACIONES PENDIENTES
CREATE OR REPLACE FUNCTION get_pending_push_notifications(
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  body text,
  data jsonb,
  type text,
  priority integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pnq.id,
    pnq.user_id,
    pnq.title,
    pnq.body,
    pnq.data,
    pnq.type,
    pnq.priority,
    pnq.created_at
  FROM push_notifications_queue pnq
  WHERE pnq.sent = false
    AND pnq.created_at > timezone('utc'::text, now()) - interval '1 hour'
  ORDER BY pnq.priority DESC, pnq.created_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 6. CREAR VISTA PARA ESTADÍSTICAS DE NOTIFICACIONES
CREATE OR REPLACE VIEW push_notifications_stats AS
SELECT 
  type,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE sent = true) as sent_notifications,
  COUNT(*) FILTER (WHERE sent = false) as pending_notifications,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as failed_notifications,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_delivery_time_seconds
FROM push_notifications_queue
WHERE created_at > timezone('utc'::text, now()) - interval '7 days'
GROUP BY type;

-- 7. FUNCIÓN DE LIMPIEZA (eliminar notificaciones antiguas)
CREATE OR REPLACE FUNCTION cleanup_old_push_notifications()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM push_notifications_queue
  WHERE created_at < timezone('utc'::text, now()) - interval '30 days'
     OR (sent = true AND created_at < timezone('utc'::text, now()) - interval '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. CONFIGURAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_push_queue_user_pending 
  ON push_notifications_queue (user_id, sent, created_at) 
  WHERE sent = false;

CREATE INDEX IF NOT EXISTS idx_push_queue_priority 
  ON push_notifications_queue (priority DESC, created_at ASC) 
  WHERE sent = false;

-- 9. INSERTAR DATOS DE PRUEBA PARA VERIFICAR
DO $$
DECLARE
  test_seller_id uuid;
BEGIN
  -- Buscar un vendedor para prueba
  SELECT id INTO test_seller_id 
  FROM auth.users 
  WHERE email LIKE '%@%' 
  LIMIT 1;
  
  IF test_seller_id IS NOT NULL THEN
    -- Crear notificación de prueba
    PERFORM enqueue_push_notification(
      test_seller_id,
      '🧪 Notificación de Prueba',
      'Sistema de notificaciones push configurado correctamente',
      jsonb_build_object(
        'test', true,
        'sound', 'critical',
        'timestamp', extract(epoch from now())
      ),
      'test',
      2
    );
    
    RAISE NOTICE 'Notificación de prueba creada para usuario: %', test_seller_id;
  ELSE
    RAISE NOTICE 'No se encontraron usuarios para crear notificación de prueba';
  END IF;
END;
$$;

-- ✅ VERIFICAR INSTALACIÓN
SELECT 
  'push_notifications_queue' as table_name,
  COUNT(*) as record_count
FROM push_notifications_queue
UNION ALL
SELECT 
  'functions' as table_name,
  COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%push%';

-- 📋 COMANDOS DE VERIFICACIÓN
-- SELECT * FROM push_notifications_queue ORDER BY created_at DESC LIMIT 5;
-- SELECT * FROM push_notifications_stats;
-- SELECT get_pending_push_notifications(5);

COMMIT;
