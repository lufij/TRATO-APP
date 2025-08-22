-- VER VALORES PERMITIDOS EN LA RESTRICCION
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'users' 
AND tc.constraint_type = 'CHECK'
AND cc.check_clause LIKE '%role%';
