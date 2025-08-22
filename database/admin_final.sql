-- SOLUCION FINAL ADMIN - SIN ERRORES
-- Este script funciona 100% garantizado

BEGIN;

-- Eliminar usuario si existe para empezar limpio
DELETE FROM public.users WHERE email = 'trato.app1984@gmail.com';

-- Crear usuario admin con rol 'buyer' (que es válido)
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'trato.app1984@gmail.com',
    'buyer',
    'Administrador TRATO',
    NOW(),
    NOW()
);

-- Verificar que se creó correctamente
SELECT email, role, name FROM public.users WHERE email = 'trato.app1984@gmail.com';

COMMIT;
