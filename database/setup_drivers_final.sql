-- CONFIGURACIÓN COMPLETA PARA APROBACIÓN DE REPARTIDORES
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Agregar columnas necesarias para repartidores
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 2. Asegurar que todos los repartidores tienen valores por defecto
UPDATE public.users 
SET 
    is_verified = COALESCE(is_verified, false),
    is_active = COALESCE(is_active, false),
    vehicle_type = COALESCE(vehicle_type, 'No especificado'),
    license_number = COALESCE(license_number, 'No especificado')
WHERE role = 'repartidor';

-- 3. Función para aprobar repartidores (para uso futuro)
CREATE OR REPLACE FUNCTION approve_driver(driver_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users 
    SET 
        is_verified = true,
        is_active = true,
        updated_at = NOW()
    WHERE id = driver_id AND role = 'repartidor';
    
    RETURN FOUND;
END;
$$;

-- 4. Mostrar repartidores actuales para verificar
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
