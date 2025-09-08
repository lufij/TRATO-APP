-- ========================================================
-- CONFIGURACIÓN REALTIME MÓVILES - DASHBOARD SUPABASE
-- ========================================================

-- EN EL DASHBOARD DE SUPABASE:
-- 1. Ve a: Settings > API
-- 2. En "Realtime" habilita:

-- TABLES TO BROADCAST:
orders: true
users: true  
products: true
daily_products: true

-- EVENTS TO BROADCAST:
INSERT: true
UPDATE: true
DELETE: true

-- ========================================================
-- PUSH NOTIFICATIONS CONFIG (Dashboard > Authentication)
-- ========================================================

-- En Authentication > Settings > Auth Providers:
-- Habilitar: Enable phone confirmations

-- En Project Settings > General:
-- Site URL: tu-dominio.vercel.app
-- Additional URLs: 
-- - https://tu-app.vercel.app
-- - https://tu-app.com (si tienes dominio)

-- ========================================================
-- REALTEME CONFIGURATION VÍA SQL
-- ========================================================

-- Habilitar realtime específicamente para móviles
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Configurar subscription channels
CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes int = 1048576)
RETURNS SETOF realtime.wal_rls
LANGUAGE sql
AS $$
  SELECT
    *
  FROM
    realtime.wal_rls
  WHERE
    (schema = 'public' AND table_name = 'orders') OR
    (schema = 'public' AND table_name = 'users')
$$;

-- ========================================================
-- VERIFICAR CONFIGURACIÓN
-- ========================================================
SELECT 
  schemaname,
  tablename,
  CASE WHEN replica_identity = 'f' THEN '✅ FULL' 
       WHEN replica_identity = 'd' THEN '⚠️ DEFAULT'
       ELSE '❌ NO CONFIGURED' 
  END as replica_identity_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename IN ('orders', 'users', 'products', 'daily_products');

SELECT 'Configuración Dashboard requerida completada' as status;
