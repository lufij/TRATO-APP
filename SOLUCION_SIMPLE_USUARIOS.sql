-- =====================================================
-- SCRIPT SIMPLE: CREAR TIPO Y REPARAR USUARIOS
-- =====================================================
-- Versión corregida que funciona sin errores
-- =====================================================

-- CREAR TIPO user_role SI NO EXISTE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('comprador', 'vendedor', 'repartidor', 'admin');
    END IF;
END $$;

-- REPARAR USUARIOS HUÉRFANOS
DO $$
DECLARE
    user_record RECORD;
    repaired INTEGER := 0;
BEGIN
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
            
            repaired := repaired + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Continuar con el siguiente
                NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Usuarios reparados: %', repaired;
END $$;

-- CREAR TRIGGER PARA FUTUROS USUARIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    user_name TEXT;
    user_role_val user_role;
BEGIN
    -- Extraer datos del metadata
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    user_role_val := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'comprador'::user_role
    );
    
    -- Crear perfil automáticamente
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
        -- No fallar el registro de auth
        RETURN NEW;
END;
$$;

-- INSTALAR TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- VERIFICAR RESULTADO
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.users) as public_users,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as huerfanos;

SELECT 'SOLUCION APLICADA - ' || NOW()::text as resultado;
