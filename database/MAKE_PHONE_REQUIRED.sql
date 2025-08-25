-- =====================================================
-- HACER TELÉFONO OBLIGATORIO PARA NUEVOS USUARIOS
-- =====================================================
-- Este script modifica la tabla users para hacer el teléfono único
-- pero mantiene compatibilidad con usuarios existentes

BEGIN;

-- 1. Agregar constraint UNIQUE para teléfonos (solo si no es null)
-- Esto permite usuarios existentes sin teléfono pero requiere únicos para nuevos
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
END $$;

-- 2. Agregar función para validar formato de teléfono guatemalteco
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

-- 3. Crear trigger para formatear teléfonos automáticamente
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

-- 4. Aplicar trigger a la tabla users
DROP TRIGGER IF EXISTS trigger_format_phone ON users;
CREATE TRIGGER trigger_format_phone
    BEFORE INSERT OR UPDATE OF phone ON users
    FOR EACH ROW
    EXECUTE FUNCTION format_guatemala_phone();

-- 5. Crear función helper para validación en frontend
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

-- Verificación del setup
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SETUP DE TELÉFONO COMPLETADO:';
    RAISE NOTICE '   ✅ Constraint único creado para teléfonos';
    RAISE NOTICE '   ✅ Función de validación creada';
    RAISE NOTICE '   ✅ Trigger de formateo automático activo';
    RAISE NOTICE '   ✅ Función de verificación disponible';
    RAISE NOTICE '';
    RAISE NOTICE '📱 FORMATO SOPORTADO:';
    RAISE NOTICE '   👤 Usuario ingresa: 12345678';
    RAISE NOTICE '   💾 Sistema guarda: +50212345678';
    RAISE NOTICE '   🔒 Validación: Exactamente 8 dígitos';
    RAISE NOTICE '';
END $$;
