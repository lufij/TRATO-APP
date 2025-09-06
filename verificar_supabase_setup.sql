-- CONSULTAS DE VERIFICACIÓN PARA SUPABASE
-- Ejecutar estas una por una en el SQL Editor de Supabase

-- 1. ¿Existe la tabla users de Supabase Auth?
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
) as auth_users_exists;

-- 2. ¿Existe tabla users en public?
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
) as public_users_exists;

-- 3. ¿Qué extensiones están habilitadas?
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- 4. ¿Existe la tabla daily_products?
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'daily_products'
) as daily_products_exists;

-- 5. ¿Cómo está estructurada la tabla daily_products?
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'daily_products'
ORDER BY ordinal_position;
