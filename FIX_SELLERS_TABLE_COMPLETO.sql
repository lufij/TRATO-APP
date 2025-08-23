-- SCRIPT COMPLETO: AGREGAR COLUMNAS FALTANTES A LA TABLA SELLERS
-- Ejecutar este script en Supabase SQL Editor ANTES de usar la aplicación

-- 1. Verificar si la tabla sellers existe, si no, crearla
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT,
    business_description TEXT,
    business_category TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    business_hours JSONB,
    delivery_time INTEGER DEFAULT 30,
    delivery_radius INTEGER DEFAULT 5,
    minimum_order DECIMAL(10, 2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_open_now BOOLEAN DEFAULT false,
    is_accepting_orders BOOLEAN DEFAULT true,
    location_verified BOOLEAN DEFAULT false,
    social_media JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Agregar columnas faltantes si no existen
DO $$ 
BEGIN
    -- Agregar business_logo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'business_logo') THEN
        ALTER TABLE sellers ADD COLUMN business_logo TEXT;
        RAISE NOTICE '✅ Columna business_logo agregada';
    ELSE
        RAISE NOTICE '⚠️ Columna business_logo ya existe';
    END IF;

    -- Agregar cover_image_url si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'cover_image_url') THEN
        ALTER TABLE sellers ADD COLUMN cover_image_url TEXT;
        RAISE NOTICE '✅ Columna cover_image_url agregada';
    ELSE
        RAISE NOTICE '⚠️ Columna cover_image_url ya existe';
    END IF;

    -- Verificar y agregar otras columnas importantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'latitude') THEN
        ALTER TABLE sellers ADD COLUMN latitude DECIMAL(10, 8);
        RAISE NOTICE '✅ Columna latitude agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'longitude') THEN
        ALTER TABLE sellers ADD COLUMN longitude DECIMAL(11, 8);
        RAISE NOTICE '✅ Columna longitude agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'address') THEN
        ALTER TABLE sellers ADD COLUMN address TEXT;
        RAISE NOTICE '✅ Columna address agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'location_verified') THEN
        ALTER TABLE sellers ADD COLUMN location_verified BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Columna location_verified agregada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' AND column_name = 'is_open_now') THEN
        ALTER TABLE sellers ADD COLUMN is_open_now BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Columna is_open_now agregada';
    END IF;

END $$;

-- 3. Habilitar RLS (Row Level Security) en la tabla sellers
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para sellers
DROP POLICY IF EXISTS "Users can view their own seller profile" ON sellers;
DROP POLICY IF EXISTS "Users can insert their own seller profile" ON sellers;
DROP POLICY IF EXISTS "Users can update their own seller profile" ON sellers;
DROP POLICY IF EXISTS "Public can view active sellers" ON sellers;

-- Política para que los usuarios vean su propio perfil
CREATE POLICY "Users can view their own seller profile" ON sellers
    FOR SELECT USING (auth.uid() = id);

-- Política para que los usuarios creen su propio perfil
CREATE POLICY "Users can insert their own seller profile" ON sellers
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Política para que los usuarios actualicen su propio perfil
CREATE POLICY "Users can update their own seller profile" ON sellers
    FOR UPDATE USING (auth.uid() = id);

-- Política para que todos puedan ver vendedores activos (para el marketplace)
CREATE POLICY "Public can view active sellers" ON sellers
    FOR SELECT USING (is_active = true);

-- 5. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sellers_is_active ON sellers(is_active);
CREATE INDEX IF NOT EXISTS idx_sellers_is_open_now ON sellers(is_open_now);
CREATE INDEX IF NOT EXISTS idx_sellers_location ON sellers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sellers_business_category ON sellers(business_category);

-- 6. Verificar estructura final de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sellers' 
ORDER BY ordinal_position;

-- 7. Mostrar mensaje de confirmación
SELECT 'Tabla sellers configurada correctamente con todas las columnas necesarias' AS status;
