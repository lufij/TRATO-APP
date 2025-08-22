-- SCRIPT SIMPLIFICADO PARA AGREGAR COLUMNAS DE REPARTIDORES
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Agregar columnas necesarias para repartidores
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Asegurar que is_active existe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 3. Mostrar repartidores actuales
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
