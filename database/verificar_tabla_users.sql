-- VERIFICAR ESTRUCTURA DE LA TABLA USERS
-- Este script verifica qué columnas tiene la tabla users

-- Ver todas las columnas de la tabla users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
