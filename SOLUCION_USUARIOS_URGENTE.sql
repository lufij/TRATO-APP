-- =====================================================
-- SOLUCIÓN URGENTE: PROBLEMA DE REGISTRO DE USUARIOS
-- =====================================================
-- Ejecutar DESPUÉS del diagnóstico para solucionar:
-- ❌ Usuarios huérfanos (auth.users sin public.users)
-- ❌ Políticas RLS incorrectas
-- ❌ Permisos faltantes

-- 🚨 IMPORTANTE: EJECUTAR COMO ADMINISTRADOR EN SUPABASE
-- =====================================================

-- PASO 1: REPARAR USUARIOS HUÉRFANOS
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    affected_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 === INICIANDO REPARACIÓN DE USUARIOS ===';
    RAISE NOTICE '';
    RAISE NOTICE '1️⃣ Creando perfiles faltantes para usuarios huérfanos...';
    
    -- Crear perfiles para usuarios que existen en auth.users pero no en public.users
    FOR user_record IN 
        SELECT 
            au.id,
            au.email,
            COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
            COALESCE(au.raw_user_meta_data->>'role', 'comprador') as role,
            au.created_at,
            au.updated_at
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.users (
                id,
                email,
                name,
                role,
                created_at,
                updated_at
            ) VALUES (
                user_record.id,
                user_record.email,
                user_record.name,
                user_record.role::user_role,
                user_record.created_at,
                COALESCE(user_record.updated_at, NOW())
            );
            
            affected_count := affected_count + 1;
            RAISE NOTICE '✅ Perfil creado para: % (%) - Rol: %', 
                user_record.email, user_record.name, user_record.role;
                
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error creando perfil para %: %', 
                    user_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Perfiles creados: %', affected_count;
    
    IF affected_count = 0 THEN
        RAISE NOTICE '✅ No se encontraron usuarios huérfanos que reparar';
    ELSE
        RAISE NOTICE '🎉 Se repararon % usuarios huérfanos', affected_count;
    END IF;
END $$;

-- PASO 2: VERIFICAR Y REPARAR POLÍTICAS RLS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ Verificando y reparando políticas RLS...';
END $$;

-- Habilitar RLS si no está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas correctamente
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;  
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Crear políticas RLS correctas
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.users FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- Política adicional para casos especiales
CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id OR true); -- Permitir lectura pública pero asegurar acceso propio

-- PASO 3: REPARAR POLÍTICAS DE TABLAS RELACIONADAS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ Reparando políticas de tablas sellers y drivers...';
END $$;

-- SELLERS TABLE
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seller profiles are viewable by everyone" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can insert their own profile" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can update their own profile" ON public.sellers;

CREATE POLICY "Seller profiles are viewable by everyone" 
    ON public.sellers FOR SELECT 
    USING (true);

CREATE POLICY "Sellers can insert their own profile" 
    ON public.sellers FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Sellers can update their own profile" 
    ON public.sellers FOR UPDATE 
    USING (auth.uid() = id);

-- DRIVERS TABLE  
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Driver profiles are viewable by everyone" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can insert their own profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can update their own profile" ON public.drivers;

CREATE POLICY "Driver profiles are viewable by everyone" 
    ON public.drivers FOR SELECT 
    USING (true);

CREATE POLICY "Drivers can insert their own profile" 
    ON public.drivers FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Drivers can update their own profile" 
    ON public.drivers FOR UPDATE 
    USING (auth.uid() = id);

-- PASO 4: CREAR FUNCIÓN DE AUTO-CREACIÓN DE PERFILES (OPCIONAL)
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '4️⃣ Creando función de auto-creación de perfiles...';
END $$;

-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_role_val user_role;
BEGIN
    -- Extraer nombre del metadata o usar email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Extraer rol del metadata o usar 'comprador' por defecto
    user_role_val := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'comprador'::user_role
    );
    
    -- Insertar perfil en public.users
    INSERT INTO public.users (
        id,
        email,
        name,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_role_val,
        NEW.created_at,
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error pero no fallar el registro de auth
        RAISE LOG 'Error auto-creando perfil para %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para auto-creación de perfiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- PASO 5: VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    orphaned_count INTEGER;
    policies_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '5️⃣ === VERIFICACIÓN FINAL ===';
    
    -- Contar usuarios
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    orphaned_count := auth_count - public_count;
    
    -- Contar políticas
    SELECT COUNT(*) INTO policies_count 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTADÍSTICAS FINALES:';
    RAISE NOTICE '========================';
    RAISE NOTICE 'Usuarios en auth.users: %', auth_count;
    RAISE NOTICE 'Usuarios en public.users: %', public_count;
    RAISE NOTICE 'Usuarios huérfanos: %', orphaned_count;
    RAISE NOTICE 'Políticas RLS en users: %', policies_count;
    RAISE NOTICE '';
    
    IF orphaned_count = 0 THEN
        RAISE NOTICE '🎉 ¡PROBLEMA SOLUCIONADO! No hay usuarios huérfanos';
    ELSE
        RAISE NOTICE '⚠️ Aún hay % usuarios huérfanos (revisar errores arriba)', orphaned_count;
    END IF;
    
    IF policies_count >= 3 THEN
        RAISE NOTICE '✅ Políticas RLS configuradas correctamente';
    ELSE
        RAISE NOTICE '⚠️ Faltan políticas RLS (deberían ser al menos 3)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Probar registro de nuevo usuario';
    RAISE NOTICE '2. Verificar que se crea perfil automáticamente';
    RAISE NOTICE '3. Revisar logs de aplicación React';
    RAISE NOTICE '';
    RAISE NOTICE '✅ REPARACIÓN COMPLETADA';
END $$;

-- Mostrar políticas finales
SELECT 
    'POLÍTICA: ' || policyname as politica_final,
    'COMANDO: ' || cmd as comando,
    'TABLA: ' || tablename as tabla
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'sellers', 'drivers')
ORDER BY tablename, policyname;

SELECT '🎉 SOLUCIÓN APLICADA - ' || NOW()::text as resultado_final;
