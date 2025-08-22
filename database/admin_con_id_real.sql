-- SOLUCION CORRECTA USANDO ID REAL DE AUTH.USERS
-- Este script busca el ID real del usuario y lo usa correctamente

BEGIN;

-- Eliminar usuario si existe en public.users
DELETE FROM public.users WHERE email = 'trato.app1984@gmail.com';

-- Crear usuario usando el ID real de auth.users
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
SELECT 
    au.id,  -- Usar el ID real de auth.users
    'trato.app1984@gmail.com',
    'vendedor',
    'Administrador TRATO',
    NOW(),
    NOW()
FROM auth.users au 
WHERE au.email = 'trato.app1984@gmail.com';

-- Verificar que se creó correctamente
SELECT email, role, name FROM public.users WHERE email = 'trato.app1984@gmail.com';

COMMIT;

SELECT 'Admin creado exitosamente usando ID real' as resultado;
