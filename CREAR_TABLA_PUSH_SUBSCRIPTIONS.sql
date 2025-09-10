-- CREAR TABLA PARA SUSCRIPCIONES PUSH NOTIFICATIONS
-- Permitir notificaciones con app cerrada (crítico para vendedores)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Evitar duplicados por usuario
  UNIQUE(user_id)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver/editar sus propias suscripciones
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Función para limpiar suscripciones inactivas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_inactive_push_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM push_subscriptions 
  WHERE active = false 
    AND updated_at < NOW() - INTERVAL '30 days';
    
  RAISE NOTICE 'Suscripciones inactivas eliminadas: %', found;
END;
$$;

-- Función para obtener suscripciones activas por tipo de usuario
CREATE OR REPLACE FUNCTION get_active_push_subscriptions(user_type text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  user_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.user_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    p.role as user_role
  FROM push_subscriptions ps
  JOIN profiles p ON ps.user_id = p.id
  WHERE ps.active = true
    AND (user_type IS NULL OR p.role = user_type);
END;
$$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_push_subscription_timestamp
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_timestamp();

-- Comentarios para documentación
COMMENT ON TABLE push_subscriptions IS 'Suscripciones a Push Notifications para notificaciones con app cerrada';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Endpoint único del navegador para envío de push';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Clave pública P-256 para encriptación';
COMMENT ON COLUMN push_subscriptions.auth IS 'Clave de autenticación para encriptación';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'User agent del navegador para debugging';
COMMENT ON COLUMN push_subscriptions.active IS 'Si la suscripción está activa y funcional';
