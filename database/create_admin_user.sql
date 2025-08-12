-- Script para crear manualmente el usuario administrador de TRATO
-- Ejecutar solo si el usuario trato.app1984@gmail.com no puede acceder automáticamente

DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Buscar si ya existe un usuario autenticado con este email en auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'trato.app1984@gmail.com' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Si existe en auth pero no en users, crear el perfil
        INSERT INTO users (id, email, name, role, phone, created_at, updated_at)
        VALUES (
            admin_user_id,
            'trato.app1984@gmail.com',
            'Administrador TRATO',
            'comprador',
            '+502 0000-0000',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            updated_at = NOW();
            
        RAISE NOTICE 'Perfil de administrador creado/actualizado para usuario existente: %', admin_user_id;
    ELSE
        RAISE NOTICE 'No se encontró usuario autenticado con email trato.app1984@gmail.com en auth.users';
        RAISE NOTICE 'El usuario debe ser creado primero a través de Supabase Auth o la aplicación';
    END IF;
END $$;

-- Verificar que el perfil fue creado correctamente
SELECT 
    id,
    email,
    name,
    role,
    created_at
FROM users 
WHERE email = 'trato.app1984@gmail.com';