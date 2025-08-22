-- VERIFICAR SI EXISTE LA TABLA DRIVERS Y SU ESTRUCTURA
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'drivers'
ORDER BY ordinal_position;

-- VERIFICAR REPARTIDORES EN LA TABLA USERS
SELECT 
    id,
    email,
    name,
    phone,
    role,
    is_active,
    created_at
FROM public.users 
WHERE role = 'repartidor'
ORDER BY created_at DESC;
