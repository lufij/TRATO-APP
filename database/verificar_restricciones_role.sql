-- VERIFICAR RESTRICCIONES DE LA TABLA USERS
-- Este script verifica qué valores están permitidos para el rol

-- Ver todas las restricciones de la tabla users
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'users'
AND tc.constraint_type = 'CHECK';

-- Ver la definición específica de la columna role
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'role';
