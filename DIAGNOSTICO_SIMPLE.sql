-- DIAGNÓSTICO SIMPLIFICADO Y FUNCIONAL
-- ====================================

-- 1. ESTRUCTURA DE LA TABLA ORDERS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. TABLAS RELACIONADAS QUE EXISTEN
SELECT 'users' as table_name, COUNT(*) as record_count FROM users;
SELECT 'sellers' as table_name, COUNT(*) as record_count FROM sellers;  
SELECT 'drivers' as table_name, COUNT(*) as record_count FROM drivers;

-- 3. USUARIOS POR ROLE
SELECT 
    role,
    COUNT(*) as count,
    array_agg(id) as sample_ids
FROM users 
GROUP BY role;

-- 4. SELLERS DISPONIBLES
SELECT 
    id,
    business_name,
    created_at
FROM sellers 
ORDER BY created_at DESC
LIMIT 3;

-- 5. DRIVERS DISPONIBLES
SELECT 
    id,
    is_active,
    created_at
FROM drivers 
ORDER BY created_at DESC
LIMIT 3;

-- 6. ÓRDENES EXISTENTES (EJEMPLO)
SELECT 
    id,
    buyer_id,
    seller_id,
    driver_id,
    status,
    customer_name,
    total
FROM orders 
ORDER BY created_at DESC
LIMIT 2;

-- 7. ESTADO RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'orders';

-- 8. CREAR BUYER TEMPORAL SI NO HAY
INSERT INTO users (id, email, name, role, created_at) 
VALUES ('temp-buyer-123', 'buyer@test.com', 'Test Buyer', 'buyer', NOW())
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  updated_at = NOW()
RETURNING id, role;
