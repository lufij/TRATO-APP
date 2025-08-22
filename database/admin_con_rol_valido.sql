-- CONFIGURAR ADMIN CON ROL VALIDO
-- Este script usa roles válidos existentes

BEGIN;

-- Primero verificar qué roles existen en la base de datos
SELECT DISTINCT role FROM public.users WHERE role IS NOT NULL;

-- Opción 1: Crear/actualizar usuario con rol 'seller' (que probablemente es válido)
UPDATE public.users 
SET role = 'seller', name = 'Administrador TRATO', updated_at = NOW()
WHERE email = 'trato.app1984@gmail.com';

-- Si no existe, crearlo con rol seller
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
SELECT gen_random_uuid(), 'trato.app1984@gmail.com', 'seller', 'Administrador TRATO', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'trato.app1984@gmail.com');

-- Verificar resultado
SELECT email, role, name FROM public.users WHERE email = 'trato.app1984@gmail.com';

COMMIT;

-- Nota: Después de esto, modificaremos el código para que el rol 'seller' 
-- con email específico tenga permisos de admin
