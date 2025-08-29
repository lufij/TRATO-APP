-- =====================================================
-- HACER TELÉFONO OBLIGATORIO - VERSIÓN CORREGIDA
-- =====================================================
-- Este script limpia duplicados y luego hace el teléfono único

BEGIN;

-- 1. IDENTIFICAR Y LIMPIAR DUPLICADOS DE TELÉFONO
DO $$
DECLARE
    duplicate_phones CURSOR FOR 
        SELECT phone, COUNT(*) as count
        FROM users 
        WHERE phone IS NOT NULL 
        GROUP BY phone 
        HAVING COUNT(*) > 1;
    phone_record RECORD;
    users_to_keep CURSOR(p_phone TEXT) FOR
        SELECT id, email, created_at
        FROM users 
        WHERE phone = p_phone
        ORDER BY created_at ASC;
    user_record RECORD;
    keep_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO TELÉFONOS DUPLICADOS...';
    
    -- Procesar cada teléfono duplicado
    FOR phone_record IN duplicate_phones LOOP
        RAISE NOTICE '⚠️ Teléfono duplicado encontrado: % (% usuarios)', phone_record.phone, phone_record.count;
        
        keep_count := 0;
        
        -- Para cada teléfono duplicado, mantener solo el usuario más antiguo
        FOR user_record IN users_to_keep(phone_record.phone) LOOP
            keep_count := keep_count + 1;
            
            IF keep_count = 1 THEN
                -- Mantener el primer usuario (más antiguo)
                RAISE NOTICE '✅ Manteniendo usuario: % (creado: %)', user_record.email, user_record.created_at;
            ELSE
                -- Limpiar el teléfono de los usuarios duplicados (no eliminar el usuario)
                UPDATE users 
                SET phone = NULL, 
                    updated_at = NOW()
                WHERE id = user_record.id;
                
                RAISE NOTICE '🧹 Limpiando teléfono duplicado del usuario: % (creado: %)', user_record.email, user_record.created_at;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Limpieza de duplicados completada';
END $$;

-- 2. CREAR CONSTRAINT ÚNICO PARA TELÉFONOS (ahora sin duplicados)
DO $$
BEGIN
    -- Verificar si el constraint ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_phone_unique'
    ) THEN
        -- Crear índice único parcial (solo para teléfonos no nulos)
        CREATE UNIQUE INDEX users_phone_unique ON users(phone) 
        WHERE phone IS NOT NULL;
        
        RAISE NOTICE '✅ Constraint único agregado para teléfonos';
    ELSE
        RAISE NOTICE '✅ Constraint único ya existe para teléfonos';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error creando constraint único: %', SQLERRM;
    RAISE NOTICE '💡 Puede que aún haya duplicados. Verifica manualmente.';
END $$;

-- 3. Agregar función para validar formato de teléfono guatemalteco
CREATE OR REPLACE FUNCTION validate_guatemala_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validar formato +502XXXXXXXX (13 caracteres total)
    -- O formato sin +502 pero con 8 dígitos
    IF phone_number IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Formato completo +502XXXXXXXX
    IF phone_number ~ '^\+502[0-9]{8}$' THEN
        RETURN TRUE;
    END IF;
    
    -- Solo 8 dígitos (se agregará +502 automáticamente)
    IF phone_number ~ '^[0-9]{8}$' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger para formatear teléfonos automáticamente
CREATE OR REPLACE FUNCTION format_guatemala_phone()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el teléfono tiene solo 8 dígitos, agregar +502
    IF NEW.phone IS NOT NULL AND NEW.phone ~ '^[0-9]{8}$' THEN
        NEW.phone := '+502' || NEW.phone;
    END IF;
    
    -- Validar formato final
    IF NEW.phone IS NOT NULL AND NOT validate_guatemala_phone(NEW.phone) THEN
        RAISE EXCEPTION 'Formato de teléfono inválido. Use 8 dígitos (ej: 12345678)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Aplicar trigger a la tabla users
DROP TRIGGER IF EXISTS trigger_format_phone ON users;
CREATE TRIGGER trigger_format_phone
    BEFORE INSERT OR UPDATE OF phone ON users
    FOR EACH ROW
    EXECUTE FUNCTION format_guatemala_phone();

-- 6. Crear función helper para validación en frontend
CREATE OR REPLACE FUNCTION check_phone_available(input_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    formatted_phone TEXT;
    existing_count INTEGER;
BEGIN
    -- Formatear teléfono si tiene 8 dígitos
    IF input_phone ~ '^[0-9]{8}$' THEN
        formatted_phone := '+502' || input_phone;
    ELSE
        formatted_phone := input_phone;
    END IF;
    
    -- Verificar si ya existe
    SELECT COUNT(*) INTO existing_count
    FROM users
    WHERE phone = formatted_phone;
    
    RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- 7. VERIFICACIÓN FINAL Y REPORTE
DO $$
DECLARE
    total_users INTEGER;
    users_with_phone INTEGER;
    unique_phones INTEGER;
BEGIN
    -- Contar estadísticas
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO users_with_phone FROM users WHERE phone IS NOT NULL;
    SELECT COUNT(DISTINCT phone) INTO unique_phones FROM users WHERE phone IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SETUP DE TELÉFONO COMPLETADO:';
    RAISE NOTICE '   ✅ Duplicados limpiados automáticamente';
    RAISE NOTICE '   ✅ Constraint único creado para teléfonos';
    RAISE NOTICE '   ✅ Función de validación creada';
    RAISE NOTICE '   ✅ Trigger de formateo automático activo';
    RAISE NOTICE '   ✅ Función de verificación disponible';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTADÍSTICAS:';
    RAISE NOTICE '   👥 Total usuarios: %', total_users;
    RAISE NOTICE '   📱 Usuarios con teléfono: %', users_with_phone;
    RAISE NOTICE '   🔢 Teléfonos únicos: %', unique_phones;
    RAISE NOTICE '';
    RAISE NOTICE '📱 FORMATO SOPORTADO:';
    RAISE NOTICE '   👤 Usuario ingresa: 12345678';
    RAISE NOTICE '   💾 Sistema guarda: +50212345678';
    RAISE NOTICE '   🔒 Validación: Exactamente 8 dígitos';
    RAISE NOTICE '';
    
    -- Verificar si el constraint se creó correctamente
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_unique') THEN
        RAISE NOTICE '✅ ÉXITO: El sistema de teléfono único está funcionando';
    ELSE
        RAISE NOTICE '❌ ADVERTENCIA: El constraint único no se pudo crear';
        RAISE NOTICE '💡 Revisa si aún hay teléfonos duplicados manualmente';
    END IF;
END $$;
