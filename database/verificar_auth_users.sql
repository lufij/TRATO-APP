-- PLAN B: VERIFICAR SI EXISTE EN AUTH.USERS PRIMERO
-- Si no existe, creamos solo en public.users

-- Verificar si existe en auth.users
SELECT 
    'Usuario encontrado en auth.users' as estado,
    id, 
    email, 
    created_at
FROM auth.users 
WHERE email = 'trato.app1984@gmail.com';

-- Si no aparece nada arriba, ejecutar esto:
-- INSERT INTO public.users (id, email, role, name, created_at, updated_at)
-- VALUES (
--     'b63f120f-62b9-4240-91af-9a9dd4c758ab'::uuid,  -- ID fijo para evitar problemas
--     'trato.app1984@gmail.com',
--     'vendedor',
--     'Administrador TRATO',
--     NOW(),
--     NOW()
-- );
