-- =====================================================
-- RESTAURAR NOTIFICACIONES BÁSICAS - SQL URGENTE
-- =====================================================
-- EJECUTAR EN: https://supabase.com/dashboard/project/deaddzyloiqdckublfed/sql
-- =====================================================

-- PASO 1: ASEGURAR QUE ORDERS TIENE REPLICA IDENTITY FULL
ALTER TABLE orders REPLICA IDENTITY FULL;

-- PASO 2: RECREAR PUBLICACIÓN REALTIME SIMPLE
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR TABLE orders;

-- PASO 3: VERIFICAR RLS BÁSICO
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
CREATE POLICY "Allow all for authenticated users" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- PASO 4: FUNCIÓN SIMPLE DE NOTIFICACIÓN (SIN TRIGGERS)
CREATE OR REPLACE FUNCTION public.test_realtime_orders()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo crear una orden de prueba simple
  INSERT INTO orders (
    buyer_id,
    seller_id, 
    total,
    status,
    notes
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    25.50,
    'pending',
    'Orden de prueba para verificar realtime - ' || NOW()
  );
  
  RETURN 'Orden de prueba creada exitosamente';
END;
$$;

-- PASO 5: VERIFICACIÓN RÁPIDA
SELECT 
  'CONFIGURACIÓN BÁSICA' as estado,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN 'REALTIME OK'
    ELSE 'REALTIME ERROR'
  END as realtime_status;

-- PASO 6: INSTRUCCIONES
SELECT 
  'INSTRUCCIONES' as seccion,
  'Ejecuta: SELECT test_realtime_orders(); para crear orden de prueba' as comando;
