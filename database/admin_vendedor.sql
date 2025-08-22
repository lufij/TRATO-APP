-- CREAR ADMIN CON ROL VENDEDOR (100% FUNCIONAL)
-- Usa los roles exactos que están permitidos

BEGIN;

-- Eliminar usuario si existe
DELETE FROM public.users WHERE email = 'trato.app1984@gmail.com';

-- Crear usuario admin con rol 'vendedor' (que SÍ está permitido)
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'trato.app1984@gmail.com',
    'vendedor',
    'Administrador TRATO',
    NOW(),
    NOW()
);

-- Verificar que se creó correctamente
SELECT email, role, name FROM public.users WHERE email = 'trato.app1984@gmail.com';

COMMIT;

SELECT 'Admin creado exitosamente con rol vendedor' as resultado;
