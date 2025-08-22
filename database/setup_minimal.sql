-- ============================================================================
-- TRATO - CONFIGURACIÓN MÍNIMA SIN ERRORES
-- ============================================================================
-- Este script crea solo las tablas esenciales para que funcione la autenticación

-- Crear extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA USERS (ESENCIAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('comprador', 'vendedor', 'repartidor', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política básica para users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================================
-- TABLA SELLERS (PARA VENDEDORES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_description TEXT,
    business_address TEXT,
    is_open BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para sellers
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Políticas para sellers
DROP POLICY IF EXISTS "sellers_select_all" ON public.sellers;
CREATE POLICY "sellers_select_all" ON public.sellers FOR SELECT USING (true);

DROP POLICY IF EXISTS "sellers_modify_own" ON public.sellers;
CREATE POLICY "sellers_modify_own" ON public.sellers FOR ALL USING (auth.uid() = id);

-- ============================================================================
-- TABLA PRODUCTS (PARA PRODUCTOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
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

-- RLS para products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas para products
DROP POLICY IF EXISTS "products_select_all" ON public.products;
CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_modify_own" ON public.products;
CREATE POLICY "products_modify_own" ON public.products FOR ALL USING (auth.uid() = seller_id);

-- ============================================================================
-- PERMISOS BÁSICOS
-- ============================================================================

-- Permisos para usuarios anónimos (lectura)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT ON public.products TO anon;

-- Permisos para usuarios autenticados
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.sellers TO authenticated;
GRANT ALL ON public.products TO authenticated;

-- ============================================================================
-- FINALIZACIÓN
-- ============================================================================

-- Mensaje de confirmación simple
SELECT 'CONFIGURACION MINIMA COMPLETADA' as status;
SELECT 'Tablas creadas: users, sellers, products' as info;
SELECT 'RLS habilitado en todas las tablas' as security;
SELECT 'Ahora ejecuta diagnose_simple.sql para verificar' as next_step;
