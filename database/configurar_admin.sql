-- CONFIGURAR USUARIO ADMINISTRADOR
-- Este script configura el usuario trato.app1984@gmail.com como administrador

BEGIN;

-- 1. Verificar si el usuario existe y mostrar su información actual
DO $$
DECLARE
    user_info RECORD;
BEGIN
    -- Buscar el usuario por email
    SELECT id, email, role, is_active, name, created_at
    INTO user_info
    FROM public.users 
    WHERE email = 'trato.app1984@gmail.com';
    
    IF FOUND THEN
        RAISE NOTICE 'Usuario encontrado:';
        RAISE NOTICE 'ID: %', user_info.id;
        RAISE NOTICE 'Email: %', user_info.email;
        RAISE NOTICE 'Rol actual: %', COALESCE(user_info.role, 'NULL');
        RAISE NOTICE 'Activo: %', user_info.is_active;
        RAISE NOTICE 'Nombre: %', COALESCE(user_info.name, 'NULL');
        
        -- Actualizar el usuario para que sea administrador
        UPDATE public.users 
        SET 
            role = 'admin',
            is_active = true,
            name = COALESCE(name, 'Administrador TRATO'),
            updated_at = NOW()
        WHERE email = 'trato.app1984@gmail.com';
        
        RAISE NOTICE 'Usuario actualizado como administrador exitosamente';
        
    ELSE
        RAISE NOTICE 'Usuario no encontrado en la tabla users';
        RAISE NOTICE 'Creando usuario administrador...';
        
        -- Si no existe, crearlo (necesitarás el ID de auth.users)
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
        AND NOT EXISTS (
            SELECT 1 FROM public.users pu WHERE pu.email = 'trato.app1984@gmail.com'
        );
        
        IF FOUND THEN
            RAISE NOTICE 'Usuario administrador creado exitosamente';
        ELSE
            RAISE NOTICE 'No se pudo crear el usuario. Verifica que existe en auth.users';
        END IF;
    END IF;
END $$;

-- 2. Verificar el resultado final
SELECT 
    id,
    email,
    role,
    name,
    is_active,
    created_at,
    updated_at
FROM public.users 
WHERE email = 'trato.app1984@gmail.com';

COMMIT;

-- Mensaje final
SELECT 'Configuracion de administrador completada' as status;
