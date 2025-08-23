-- 🚨 EJECUTAR ESTE SCRIPT INMEDIATAMENTE EN SUPABASE SQL EDITOR 🚨
-- COPIA Y PEGA TODO ESTE CÓDIGO Y EJECÚTALO

-- PASO 1: Agregar las columnas que faltan (SIN VERIFICACIÓN)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS business_logo TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN DEFAULT false;

-- PASO 2: Mostrar las columnas para verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
ORDER BY column_name;

-- MENSAJE CONFIRMACIÓN
SELECT 'COLUMNAS AGREGADAS - AHORA PRUEBA LA APP' as status;
