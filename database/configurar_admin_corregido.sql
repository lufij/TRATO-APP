-- CONFIGURAR ADMINISTRADOR - VERSION CORREGIDA
-- Este script funciona sin asumir columnas que no existen

BEGIN;

-- 1. Verificar si el usuario existe
DO $$
DECLARE
    user_info RECORD;
    user_exists BOOLEAN := false;
BEGIN
    -- Verificar si el usuario existe en public.users
    SELECT COUNT(*) > 0 INTO user_exists
    FROM public.users 
    WHERE email = 'trato.app1984@gmail.com';
    
    IF user_exists THEN
        RAISE NOTICE 'Usuario encontrado en public.users';
        
        -- Mostrar información actual
        SELECT id, email, role, name
        INTO user_info
        FROM public.users 
        WHERE email = 'trato.app1984@gmail.com';
        
        RAISE NOTICE 'ID: %', user_info.id;
        RAISE NOTICE 'Email: %', user_info.email;
        RAISE NOTICE 'Rol actual: %', COALESCE(user_info.role, 'NULL');
        RAISE NOTICE 'Nombre: %', COALESCE(user_info.name, 'NULL');
        
        -- Actualizar el usuario para que sea administrador
        UPDATE public.users 
        SET 
            role = 'admin',
            name = COALESCE(name, 'Administrador TRATO'),
            updated_at = NOW()
        WHERE email = 'trato.app1984@gmail.com';
        
        RAISE NOTICE 'Usuario actualizado como administrador exitosamente';
        
    ELSE
        RAISE NOTICE 'Usuario no encontrado en public.users';
        RAISE NOTICE 'Verificando si existe en auth.users...';
        
        -- Verificar si existe en auth.users y crearlo en public.users
        INSERT INTO public.users (
            id,
            email, 
            role, 
            name,
            created_at,
            updated_at
        )
        SELECT 
            au.id,
            'trato.app1984@gmail.com',
            'admin',
            'Administrador TRATO',
            NOW(),
            NOW()
        FROM auth.users au 
        WHERE au.email = 'trato.app1984@gmail.com';
        
        GET DIAGNOSTICS user_exists = ROW_COUNT;
        
        IF user_exists > 0 THEN
            RAISE NOTICE 'Usuario administrador creado exitosamente desde auth.users';
        ELSE
            RAISE NOTICE 'Usuario no encontrado en auth.users tampoco';
        END IF;
    END IF;
END $$;

-- 2. Verificar el resultado final
SELECT 
    id,
    email,
    role,
    name,
    created_at,
    updated_at
FROM public.users 
WHERE email = 'trato.app1984@gmail.com';

-- 3. Si no existe en ninguna tabla, crear manualmente
INSERT INTO public.users (
    id,
    email,
    role,
    name,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'trato.app1984@gmail.com',
    'admin',
    'Administrador TRATO',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'trato.app1984@gmail.com'
);

COMMIT;

SELECT 'Configuracion de administrador completada' as status;
