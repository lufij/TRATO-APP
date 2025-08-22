-- CREAR REPARTIDOR DE PRUEBA PARA DEMOSTRAR LA FUNCIONALIDAD
-- Solo ejecuta esto si no tienes repartidores registrados

-- Crear un repartidor de prueba
INSERT INTO public.users (
    id,
    email,
    name,
    phone,
    role,
    vehicle_type,
    license_number,
    is_verified,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'repartidor.prueba@trato.com',
    'Juan Pérez - Repartidor',
    '+502 5555-0123',
    'repartidor',
    'Motocicleta',
    'M-123456',
    false,  -- Sin verificar inicialmente
    false,  -- Sin activar inicialmente
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verificar que se creó
SELECT 
    id,
    name,
    email,
    phone,
    role,
    vehicle_type,
    license_number,
    is_verified,
    is_active,
    created_at
FROM public.users 
WHERE role = 'repartidor'
ORDER BY created_at DESC;
