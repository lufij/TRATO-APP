-- =====================================================
-- SOLUCIÓN DEFINITIVA PARA USUARIOS HUÉRFANOS
-- =====================================================
-- Este script resuelve el problema de usuarios que se registran en auth.users
-- pero no obtienen un perfil en public.users

DO $$
BEGIN
    RAISE NOTICE '🚀 INICIANDO REPARACIÓN DE USUARIOS HUÉRFANOS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
END $$;

-- PASO 1: VERIFICAR Y REPARAR ESTRUCTURA DE TABLA users
-- ======================================================

-- Asegurar que la tabla users existe con la estructura correcta
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role user_role DEFAULT 'comprador',
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tipo user_role si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('comprador', 'vendedor', 'repartidor', 'admin');
        RAISE NOTICE '✅ Tipo user_role creado';
    END IF;
END $$;

-- PASO 2: CORREGIR POLÍTICAS RLS PROBLEMÁTICAS
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '🔒 REPARANDO POLÍTICAS RLS...';
END $$;

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "allow_users_read_own" ON public.users;
DROP POLICY IF EXISTS "allow_basic_user_info_read" ON public.users;

-- Crear políticas permisivas para registro
CREATE POLICY "allow_authenticated_insert" 
ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_users_read_own" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "allow_users_update_own" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Política para permitir lectura básica (para joins y funcionalidad)
CREATE POLICY "allow_public_basic_read" 
ON public.users FOR SELECT 
TO public
USING (true);

-- PASO 3: MIGRAR USUARIOS HUÉRFANOS EXISTENTES
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '👤 MIGRANDO USUARIOS HUÉRFANOS...';
END $$;

-- Insertar usuarios huérfanos en public.users
INSERT INTO public.users (
    id,
    email,
    name,
    role,
    phone,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)
    ) as name,
    COALESCE(
        (au.raw_user_meta_data->>'role')::user_role,
        'comprador'::user_role
    ) as role,
    au.raw_user_meta_data->>'phone' as phone,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email_confirmed_at IS NOT NULL  -- Solo usuarios confirmados
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW(),
    name = COALESCE(users.name, EXCLUDED.name),
    role = COALESCE(users.role, EXCLUDED.role);

-- PASO 4: CREAR FUNCIÓN PARA AUTO-CREACIÓN DE PERFILES
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '⚙️ CREANDO FUNCIÓN AUTO-PROFILE...';
END $$;

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        name,
        role,
        phone,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::user_role,
            'comprador'::user_role
        ),
        NEW.raw_user_meta_data->>'phone',
        NEW.created_at,
        NEW.created_at
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Si hay error, registrar pero no fallar
    RAISE WARNING 'Error creando perfil automático para %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- PASO 5: FUNCIÓN DE RECUPERACIÓN PARA USUARIOS EXISTENTES
-- =========================================================

CREATE OR REPLACE FUNCTION public.recover_orphaned_users()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH recovered AS (
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            phone,
            created_at,
            updated_at
        )
        SELECT 
            au.id,
            au.email,
            COALESCE(
                au.raw_user_meta_data->>'name',
                split_part(au.email, '@', 1)
            ),
            COALESCE(
                (au.raw_user_meta_data->>'role')::user_role,
                'comprador'::user_role
            ),
            au.raw_user_meta_data->>'phone',
            au.created_at,
            NOW()
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
        ON CONFLICT (id) DO NOTHING
        RETURNING id, email
    )
    SELECT 
        r.id,
        r.email,
        'recovered'::TEXT
    FROM recovered r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 6: VERIFICACIÓN Y LIMPIEZA
-- ================================

DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    recovered_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    
    -- Ejecutar recuperación
    SELECT COUNT(*) INTO recovered_count 
    FROM public.recover_orphaned_users();
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESULTADOS DE LA REPARACIÓN:';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Usuarios en auth.users: %', auth_count;
    RAISE NOTICE 'Usuarios en public.users: %', public_count + recovered_count;
    RAISE NOTICE 'Usuarios recuperados: %', recovered_count;
    RAISE NOTICE '';
    
    IF recovered_count > 0 THEN
        RAISE NOTICE '✅ % usuarios huérfanos recuperados exitosamente', recovered_count;
    ELSE
        RAISE NOTICE '✅ No se encontraron usuarios huérfanos para recuperar';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CONFIGURACIÓN APLICADA:';
    RAISE NOTICE '- RLS configurado con políticas permisivas para registro';
    RAISE NOTICE '- Trigger automático para nuevos usuarios';
    RAISE NOTICE '- Función de recuperación disponible';
    RAISE NOTICE '';
END $$;

-- PASO 7: VERIFICACIÓN FINAL DE RLS
-- ==================================

DO $$
BEGIN
    RAISE NOTICE '🔒 VERIFICACIÓN FINAL DE POLÍTICAS RLS:';
    
    -- Verificar que las políticas están activas
    IF EXISTS (
        SELECT 1 FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        WHERE c.relname = 'users' 
        AND p.polname = 'allow_authenticated_insert'
    ) THEN
        RAISE NOTICE '✅ Política de inserción configurada';
    ELSE
        RAISE WARNING '❌ Política de inserción faltante';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- MENSAJE FINAL
DO $$
BEGIN
    RAISE NOTICE '🎉 REPARACIÓN COMPLETADA';
    RAISE NOTICE '========================';
    RAISE NOTICE 'El sistema ahora debería:';
    RAISE NOTICE '1. Crear perfiles automáticamente para nuevos usuarios';
    RAISE NOTICE '2. Permitir inserción a usuarios autenticados';
    RAISE NOTICE '3. Haber recuperado usuarios huérfanos existentes';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Prueba crear una nueva cuenta para verificar';
END $$;

SELECT 'Reparación de usuarios huérfanos completada exitosamente' as resultado;
