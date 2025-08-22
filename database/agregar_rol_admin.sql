-- AGREGAR ROL ADMIN A LAS RESTRICCIONES
-- Este script modifica las restricciones para permitir el rol 'admin'

BEGIN;

-- Primero eliminar la restricción existente
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Crear nueva restricción que incluya 'admin'
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('buyer', 'seller', 'repartidor', 'admin'));

-- Ahora sí crear el usuario admin
UPDATE public.users 
SET role = 'admin', name = 'Administrador TRATO', updated_at = NOW()
WHERE email = 'trato.app1984@gmail.com';

-- Si no existe, crearlo
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
SELECT gen_random_uuid(), 'trato.app1984@gmail.com', 'admin', 'Administrador TRATO', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'trato.app1984@gmail.com');

-- Verificar resultado
SELECT email, role, name FROM public.users WHERE email = 'trato.app1984@gmail.com';

COMMIT;
