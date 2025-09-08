-- =====================================================
-- RLS PARA NOTIFICACIONES REALTIME MÓVILES
-- =====================================================
-- Ejecutar en: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- 1. POLÍTICAS RLS PARA ORDERS (para que el vendedor reciba notificaciones)
DROP POLICY IF EXISTS "Sellers can receive order notifications" ON orders;
CREATE POLICY "Sellers can receive order notifications" ON orders
  FOR SELECT USING (
    auth.uid() = seller_id OR 
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('vendedor', 'comprador', 'admin')
    )
  );

-- 2. POLÍTICA PARA INSERTAR ORDERS
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('comprador', 'admin')
    )
  );

-- 3. POLÍTICA PARA ACTUALIZAR ORDERS (vendedores pueden cambiar status)
DROP POLICY IF EXISTS "Sellers can update their orders" ON orders;
CREATE POLICY "Sellers can update their orders" ON orders
  FOR UPDATE USING (
    auth.uid() = seller_id OR
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('vendedor', 'admin')
    )
  );

-- 4. VERIFICAR QUE RLS ESTÉ HABILITADO EN ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS PARA USERS (para obtener info del vendedor)
DROP POLICY IF EXISTS "Users can view user profiles" ON users;
CREATE POLICY "Users can view user profiles" ON users
  FOR SELECT USING (true); -- Permitir ver perfiles públicos

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 6. VERIFICAR POLÍTICAS
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('orders', 'users');

SELECT 'RLS configurado correctamente para notificaciones realtime' as status;
