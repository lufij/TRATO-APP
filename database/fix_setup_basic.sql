-- ============================================================================
-- TRATO - Script de Configuración Básica SIN ERRORES
-- ============================================================================
-- Este script configura las tablas básicas necesarias para que la aplicación funcione
-- Evita errores de dependencias y tablas faltantes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 INICIANDO CONFIGURACIÓN BÁSICA DE TRATO...';
    RAISE NOTICE 'Este script configurará solo las tablas esenciales para evitar errores';
END $$;

-- ============================================================================
-- EXTENSIONES NECESARIAS
-- ============================================================================

-- Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PASO 1: Crear tabla users (ESENCIAL)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '👥 Configurando tabla users...';
    
    -- Crear tabla users si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE public.users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL CHECK (role IN ('comprador', 'vendedor', 'repartidor', 'admin')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabla users creada';
    ELSE
        RAISE NOTICE '✅ Tabla users ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: Configurar RLS para users
-- ============================================================================

-- Habilitar RLS en users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política básica para users - permitir lectura para usuarios autenticados
DROP POLICY IF EXISTS "Enable users to read their own data" ON public.users;
CREATE POLICY "Enable users to read their own data"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Política para permitir inserción de nuevos usuarios
DROP POLICY IF EXISTS "Enable users to insert their own data" ON public.users;
CREATE POLICY "Enable users to insert their own data"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Política para permitir actualización de datos propios
DROP POLICY IF EXISTS "Enable users to update their own data" ON public.users;
CREATE POLICY "Enable users to update their own data"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PASO 3: Crear tabla sellers (si no existe)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🏪 Configurando tabla sellers...';
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sellers') THEN
        CREATE TABLE public.sellers (
            id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
            business_name TEXT NOT NULL,
            business_description TEXT,
            business_address TEXT,
            is_open BOOLEAN DEFAULT false,
            is_verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabla sellers creada';
    ELSE
        RAISE NOTICE '✅ Tabla sellers ya existe';
        
        -- Agregar columna is_open si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'is_open') THEN
            ALTER TABLE public.sellers ADD COLUMN is_open BOOLEAN DEFAULT false;
            RAISE NOTICE '➕ Columna is_open agregada a sellers';
        END IF;
    END IF;
END $$;

-- Configurar RLS para sellers
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública de sellers
DROP POLICY IF EXISTS "Enable public read access to sellers" ON public.sellers;
CREATE POLICY "Enable public read access to sellers"
    ON public.sellers FOR SELECT
    USING (true);

-- Política para que sellers puedan actualizar sus datos
DROP POLICY IF EXISTS "Enable sellers to update their own data" ON public.sellers;
CREATE POLICY "Enable sellers to update their own data"
    ON public.sellers FOR ALL
    USING (auth.uid() = id);

-- ============================================================================
-- PASO 4: Crear tabla products (si no existe)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📦 Configurando tabla products...';
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE TABLE public.products (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category TEXT,
            image_url TEXT,
            is_available BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabla products creada';
    ELSE
        RAISE NOTICE '✅ Tabla products ya existe';
    END IF;
END $$;

-- Configurar RLS para products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública de productos
DROP POLICY IF EXISTS "Enable public read access to products" ON public.products;
CREATE POLICY "Enable public read access to products"
    ON public.products FOR SELECT
    USING (true);

-- Política para que sellers puedan gestionar sus productos
DROP POLICY IF EXISTS "Enable sellers to manage their products" ON public.products;
CREATE POLICY "Enable sellers to manage their products"
    ON public.products FOR ALL
    USING (auth.uid() = seller_id);

-- ============================================================================
-- PASO 5: Configurar permisos básicos
-- ============================================================================

-- Conceder permisos básicos a usuarios anónimos (para lectura pública)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT ON public.products TO anon;

-- Conceder permisos a usuarios autenticados
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.sellers TO authenticated;
GRANT ALL ON public.products TO authenticated;

-- ============================================================================
-- PASO 6: Configurar Storage (opcional)
-- ============================================================================

DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    RAISE NOTICE '📁 Configurando storage buckets...';
    
    -- Verificar si el bucket products existe
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'products') INTO bucket_exists;
    
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('products', 'products', true);
        RAISE NOTICE '✅ Bucket products creado';
    ELSE
        -- Asegurar que es público
        UPDATE storage.buckets SET public = true WHERE id = 'products';
        RAISE NOTICE '✅ Bucket products ya existe y es público';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No se pudo configurar storage (opcional)';
END $$;

-- Políticas de storage si es posible
DO $$
BEGIN
    -- Política de lectura pública para storage
    DROP POLICY IF EXISTS "Public read access to products bucket" ON storage.objects;
    CREATE POLICY "Public read access to products bucket"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'products');
        
    -- Permitir a usuarios autenticados subir archivos
    DROP POLICY IF EXISTS "Authenticated users can upload to products bucket" ON storage.objects;
    CREATE POLICY "Authenticated users can upload to products bucket"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
        
    RAISE NOTICE '✅ Políticas de storage configuradas';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No se pudieron configurar políticas de storage (opcional)';
END $$;

-- ============================================================================
-- FINALIZACIÓN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CONFIGURACIÓN BÁSICA COMPLETADA';
    RAISE NOTICE '';
    RAISE NOTICE 'Tablas configuradas:';
    RAISE NOTICE '  • users (con RLS)';
    RAISE NOTICE '  • sellers (con RLS)';
    RAISE NOTICE '  • products (con RLS)';
    RAISE NOTICE '  • storage buckets (opcional)';
    RAISE NOTICE '';
    RAISE NOTICE 'Ahora puedes ejecutar fix_product_policies.sql si lo necesitas';
    RAISE NOTICE '';
END $$;
