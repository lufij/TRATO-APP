-- AGREGAR COLUMNAS NECESARIAS PARA REPARTIDORES EN LA TABLA USERS
-- Este script es idempotente, solo agrega las columnas si no existen

-- Agregar columna vehicle_type si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'vehicle_type') THEN
        ALTER TABLE public.users ADD COLUMN vehicle_type TEXT;
        RAISE NOTICE 'Columna vehicle_type agregada a users';
    ELSE
        RAISE NOTICE 'Columna vehicle_type ya existe en users';
    END IF;
END $$;

-- Agregar columna license_number si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'license_number') THEN
        ALTER TABLE public.users ADD COLUMN license_number TEXT;
        RAISE NOTICE 'Columna license_number agregada a users';
    ELSE
        RAISE NOTICE 'Columna license_number ya existe en users';
    END IF;
END $$;

-- Agregar columna is_verified si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'is_verified') THEN
        ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Columna is_verified agregada a users';
    ELSE
        RAISE NOTICE 'Columna is_verified ya existe en users';
    END IF;
END $$;

-- Verificar que la columna is_active existe (debería existir ya)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Columna is_active agregada a users';
    ELSE
        RAISE NOTICE 'Columna is_active ya existe en users';
    END IF;
END $$;

-- Crear función para aprobar repartidores
CREATE OR REPLACE FUNCTION approve_driver(driver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que es un repartidor
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = driver_id AND role = 'repartidor') THEN
        RAISE EXCEPTION 'Usuario no encontrado o no es repartidor';
    END IF;
    
    -- Actualizar estado
    UPDATE public.users 
    SET 
        is_verified = true,
        is_active = true,
        updated_at = NOW()
    WHERE id = driver_id AND role = 'repartidor';
    
    RETURN true;
END;
$$;

-- Crear función para obtener repartidores pendientes de aprobación
CREATE OR REPLACE FUNCTION get_pending_drivers()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    vehicle_type TEXT,
    license_number TEXT,
    is_verified BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.vehicle_type,
        u.license_number,
        u.is_verified,
        u.is_active,
        u.created_at
    FROM public.users u
    WHERE u.role = 'repartidor'
    ORDER BY u.created_at DESC;
END;
$$;

-- Asegurar permisos para las funciones
GRANT EXECUTE ON FUNCTION approve_driver(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_drivers() TO authenticated;

-- Mostrar repartidores actuales
SELECT 
    id,
    name,
    email,
    phone,
    vehicle_type,
    license_number,
    is_verified,
    is_active,
    created_at
FROM public.users 
WHERE role = 'repartidor'
ORDER BY created_at DESC;
