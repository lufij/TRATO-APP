-- =====================================================
-- ARREGLO RÁPIDO: TRIGGER NOTIFICACIONES SIN COLUMN NAME
-- =====================================================
-- Ejecutar INMEDIATAMENTE en Supabase para arreglar el error
-- https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- 1. ELIMINAR TRIGGER DEFECTUOSO
DROP TRIGGER IF EXISTS trigger_notify_seller_new_order ON orders;

-- 2. CREAR FUNCIÓN CORREGIDA (SIN u.name que no existe)
CREATE OR REPLACE FUNCTION notify_seller_new_order()
RETURNS TRIGGER AS $$
DECLARE
  seller_info record;
  seller_name text;
BEGIN
  -- Solo para órdenes nuevas
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    -- Obtener información del vendedor desde auth.users
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u 
    WHERE u.id = NEW.seller_id 
    INTO seller_info;
    
    IF seller_info.id IS NOT NULL THEN
      -- Extraer nombre del metadata si existe, sino usar email
      seller_name := COALESCE(
        seller_info.raw_user_meta_data->>'name',
        seller_info.raw_user_meta_data->>'full_name', 
        split_part(seller_info.email, '@', 1)
      );
      
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
          'priority', 'high',
          'seller_name', seller_name
        ),
        'new_order',
        3  -- Prioridad máxima
      );
      
      RAISE NOTICE 'Notificación creada para vendedor: % (%)', seller_name, seller_info.email;
    ELSE
      RAISE NOTICE 'No se encontró vendedor con ID: %', NEW.seller_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RECREAR TRIGGER CON FUNCIÓN CORREGIDA
CREATE TRIGGER trigger_notify_seller_new_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_new_order();

-- 4. VERIFICACIÓN RÁPIDA
SELECT 'Trigger arreglado correctamente' as status;

COMMIT;
