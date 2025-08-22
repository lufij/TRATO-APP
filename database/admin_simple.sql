-- SCRIPT SUPER SIMPLE PARA ADMIN
-- Solo actualiza o inserta el usuario admin

-- Opción 1: Si ya existe, actualizarlo
UPDATE public.users 
SET role = 'admin', name = 'Administrador TRATO', updated_at = NOW()
WHERE email = 'trato.app1984@gmail.com';

-- Opción 2: Si no existe, crearlo
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
SELECT gen_random_uuid(), 'trato.app1984@gmail.com', 'admin', 'Administrador TRATO', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'trato.app1984@gmail.com');

-- Verificar resultado
SELECT email, role, name FROM public.users WHERE email = 'trato.app1984@gmail.com';
