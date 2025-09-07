-- =====================================================
-- PREVENCIÓN: TRIGGER AUTOMÁTICO PARA NUEVOS USUARIOS
-- =====================================================
-- Este script crea un sistema automático que asegura que
-- cada nuevo usuario en auth.users tenga su perfil en public.users
-- 
-- 🔒 EJECUTAR COMO ADMINISTRADOR EN SUPABASE
-- =====================================================

-- PASO 1: CREAR FUNCIÓN MEJORADA DE AUTO-CREACIÓN
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    user_name TEXT;
    user_role public.user_role;
    user_phone TEXT;
BEGIN
    -- Log del intento de creación
    RAISE LOG 'handle_new_user: Procesando usuario %', NEW.email;
    
    -- Validar que tenemos email
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RAISE LOG 'handle_new_user: Email faltante para usuario %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Extraer datos del metadata con valores por defecto
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1),
        'Usuario'
    );
    
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::public.user_role,
        'comprador'::public.user_role
    );
    
    user_phone := NEW.raw_user_meta_data->>'phone';
    
    -- Log de los datos extraídos
    RAISE LOG 'handle_new_user: Datos extraídos - name: %, role: %, phone: %', 
        user_name, user_role, user_phone;
    
    -- Verificar si ya existe el perfil (por si acaso)
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        RAISE LOG 'handle_new_user: Perfil ya existe para %', NEW.email;
        RETURN NEW;
    END IF;
    
    -- Crear perfil en public.users
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
            user_name,
            user_role,
            user_phone,
            NEW.created_at,
            NOW()
        );
        
        RAISE LOG 'handle_new_user: ✅ Perfil creado exitosamente para %', NEW.email;
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE LOG 'handle_new_user: Perfil duplicado para % (ignorando)', NEW.email;
        WHEN OTHERS THEN
            RAISE LOG 'handle_new_user: ❌ Error creando perfil para %: % (SQLSTATE: %)', 
                NEW.email, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$;

-- PASO 2: CREAR/RECREAR TRIGGER
-- =====================================================
-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear nuevo trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- PASO 3: CREAR FUNCIÓN DE REPARACIÓN AUTOMÁTICA
-- =====================================================
CREATE OR REPLACE FUNCTION public.repair_orphaned_users()
RETURNS TABLE(
    repaired_count INTEGER,
    error_count INTEGER,
    details JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    user_record RECORD;
    repaired INTEGER := 0;
    errors INTEGER := 0;
    repair_details JSONB := '[]'::JSONB;
    current_detail JSONB;
BEGIN
    FOR user_record IN 
        SELECT 
            au.id,
            au.email,
            COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
            COALESCE(au.raw_user_meta_data->>'role', 'comprador') as role,
            au.raw_user_meta_data->>'phone' as phone,
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
                phone,
                created_at,
                updated_at
            ) VALUES (
                user_record.id,
                user_record.email,
                user_record.name,
                user_record.role::public.user_role,
                user_record.phone,
                user_record.created_at,
                COALESCE(user_record.updated_at, NOW())
            );
            
            repaired := repaired + 1;
            
            current_detail := jsonb_build_object(
                'email', user_record.email,
                'name', user_record.name,
                'role', user_record.role,
                'status', 'repaired'
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                errors := errors + 1;
                
                current_detail := jsonb_build_object(
                    'email', user_record.email,
                    'name', user_record.name,
                    'role', user_record.role,
                    'status', 'error',
                    'error', SQLERRM
                );
        END;
        
        repair_details := repair_details || current_detail;
    END LOOP;
    
    RETURN QUERY SELECT repaired, errors, repair_details;
END;
$$;

-- PASO 4: CREAR FUNCIÓN DE MONITOREO
-- =====================================================
CREATE OR REPLACE FUNCTION public.monitor_user_sync()
RETURNS TABLE(
    auth_users_count INTEGER,
    public_users_count INTEGER,
    orphaned_users_count INTEGER,
    sync_status TEXT,
    last_check TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    orphaned INTEGER;
    status_text TEXT;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    orphaned := auth_count - public_count;
    
    IF orphaned = 0 THEN
        status_text := '✅ SINCRONIZADO';
    ELSIF orphaned > 0 AND orphaned <= 5 THEN
        status_text := '⚠️ POCOS HUÉRFANOS';
    ELSE
        status_text := '🚨 MUCHOS HUÉRFANOS';
    END IF;
    
    RETURN QUERY SELECT 
        auth_count,
        public_count,
        orphaned,
        status_text,
        NOW();
END;
$$;

-- PASO 5: VERIFICACIÓN Y PRUEBA
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 === SISTEMA DE PREVENCIÓN INSTALADO ===';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Función handle_new_user() creada';
    RAISE NOTICE '✅ Trigger on_auth_user_created instalado';  
    RAISE NOTICE '✅ Función repair_orphaned_users() disponible';
    RAISE NOTICE '✅ Función monitor_user_sync() disponible';
    RAISE NOTICE '';
    RAISE NOTICE '📋 COMANDOS ÚTILES:';
    RAISE NOTICE '';
    RAISE NOTICE '-- Monitorear estado:';
    RAISE NOTICE 'SELECT * FROM public.monitor_user_sync();';
    RAISE NOTICE '';
    RAISE NOTICE '-- Reparar usuarios huérfanos:';
    RAISE NOTICE 'SELECT * FROM public.repair_orphaned_users();';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 AHORA LOS NUEVOS USUARIOS SE CREARÁN AUTOMÁTICAMENTE';
END $$;

-- Ejecutar monitoreo inicial
SELECT * FROM public.monitor_user_sync();

-- Mostrar triggers instalados
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
AND trigger_name = 'on_auth_user_created';

SELECT '🎉 SISTEMA DE PREVENCIÓN INSTALADO - ' || NOW()::text as resultado;
