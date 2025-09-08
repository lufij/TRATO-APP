-- =====================================================
-- CONFIGURACIÓN SUPABASE PARA NOTIFICACIONES MÓVILES
-- =====================================================
-- Ejecutar en: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- 1. HABILITAR REALTIME EN LA TABLA ORDERS
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 2. HABILITAR PUBLICACIÓN REALTIME PARA ORDERS
BEGIN;
  -- Remover publicación existente si existe
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Crear nueva publicación que incluya orders
  CREATE PUBLICATION supabase_realtime FOR TABLE orders;
  
  -- También incluir otras tablas importantes
  ALTER PUBLICATION supabase_realtime ADD TABLE users;
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  ALTER PUBLICATION supabase_realtime ADD TABLE daily_products;
COMMIT;

-- 3. VERIFICAR QUE REALTIME ESTÉ HABILITADO
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('orders', 'users', 'products', 'daily_products');

-- 4. VERIFICAR PUBLICACIÓN REALTIME
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

SELECT 'Realtime configurado correctamente para notificaciones móviles' as status;
