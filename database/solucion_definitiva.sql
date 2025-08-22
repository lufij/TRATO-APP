-- SOLUCION DEFINITIVA SIN RESTRICCIONES
-- Elimina la restricción problemática y crea el admin

BEGIN;

-- Paso 1: Eliminar la restricción que causa problemas
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Paso 2: Eliminar usuario si existe
DELETE FROM public.users WHERE email = 'trato.app1984@gmail.com';

-- Paso 3: Crear usuario admin sin restricciones
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'trato.app1984@gmail.com',
    'admin',
    'Administrador TRATO',
    NOW(),
    NOW()
);

-- Paso 4: Verificar que se creó
SELECT email, role, name FROM public.users WHERE email = 'trato.app1984@gmail.com';

-- Paso 5: Recrear restricción más amplia
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('comprador', 'vendedor', 'repartidor', 'buyer', 'seller', 'driver', 'admin'));

COMMIT;

SELECT 'Admin creado exitosamente' as resultado;
