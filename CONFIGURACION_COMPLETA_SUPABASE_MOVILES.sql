-- =====================================================
-- CONFIGURACIÓN COMPLETA SUPABASE PARA MÓVILES
-- =====================================================
-- EJECUTAR TODO EN: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- PASO 1: HABILITAR REALTIME EN ORDERS
ALTER TABLE orders REPLICA IDENTITY FULL;

-- PASO 2: CONFIGURAR PUBLICACIÓN REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE orders, users, products, daily_products;
COMMIT;

-- PASO 3: RLS PARA ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can receive order notifications" ON orders;
CREATE POLICY "Sellers can receive order notifications" ON orders
  FOR SELECT USING (
    auth.uid() = seller_id OR 
    auth.uid() = buyer_id OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('vendedor', 'comprador', 'admin'))
  );

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('comprador', 'admin'))
  );

-- PASO 4: RLS PARA USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles" ON users;
CREATE POLICY "Users can view profiles" ON users
  FOR SELECT USING (true);

-- PASO 5: CREAR FUNCIÓN JAVASCRIPT PARA NOTIFICACIONES (Edge Function)
-- Nota: Esta función debe crearse en el dashboard de Supabase > Edge Functions

-- PASO 6: CONFIGURAR WEBHOOK (opcional para notificaciones server-side)
-- En Dashboard > Database > Webhooks crear webhook que apunte a función edge

-- VERIFICACIÓN
SELECT 
  'orders' as table_name,
  CASE WHEN rowsecurity THEN '✅ RLS Habilitado' ELSE '❌ RLS Deshabilitado' END as rls_status
FROM pg_tables WHERE tablename = 'orders'
UNION ALL
SELECT 
  'realtime_publication' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN '✅ Realtime Configurado' ELSE '❌ Realtime No Configurado' END as status;

SELECT 'Configuración base completada - ahora configura en el Dashboard' as next_step;
