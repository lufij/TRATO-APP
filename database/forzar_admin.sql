-- SCRIPT ALTERNATIVO - FORZAR CREACION DE ADMINISTRADOR
-- Si el script anterior no funciona, usa este

BEGIN;

-- Insertar o actualizar usuario administrador
INSERT INTO public.users (
    id,
    email,
    role,
    name,
    is_active,
    created_at,
    updated_at
)
SELECT 
    au.id,
    'trato.app1984@gmail.com',
    'admin',
    'Administrador TRATO',
    true,
    NOW(),
    NOW()
FROM auth.users au 
WHERE au.email = 'trato.app1984@gmail.com'
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'admin',
    is_active = true,
    name = 'Administrador TRATO',
    updated_at = NOW();

-- Verificar resultado
SELECT 
    'Usuario configurado como administrador' as mensaje,
    email,
    role,
    is_active
FROM public.users 
WHERE email = 'trato.app1984@gmail.com';

COMMIT;
