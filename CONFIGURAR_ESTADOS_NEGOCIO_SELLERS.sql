-- ============================================
-- CONFIGURACIÓN ESTADOS DE NEGOCIO PARA SELLERS
-- ============================================
-- Script para asegurar que los campos necesarios
-- para el sistema de estados de negocio estén disponibles

DO $$
BEGIN
    -- Agregar is_open_now si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sellers' AND column_name = 'is_open_now'
    ) THEN
        ALTER TABLE sellers ADD COLUMN is_open_now BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Campo is_open_now agregado a sellers';
    ELSE
        RAISE NOTICE '✅ Campo is_open_now ya existe en sellers';
    END IF;

    -- Agregar weekly_hours si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sellers' AND column_name = 'weekly_hours'
    ) THEN
        ALTER TABLE sellers ADD COLUMN weekly_hours JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Campo weekly_hours agregado a sellers';
    ELSE
        RAISE NOTICE '✅ Campo weekly_hours ya existe en sellers';
    END IF;

    -- Verificar que los campos estén disponibles
    RAISE NOTICE '🔍 Verificando estructura de sellers...';
    
    PERFORM 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'is_open_now';
    
    PERFORM 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'weekly_hours';
    
    RAISE NOTICE '✅ Configuración de estados de negocio completada';
END $$;

-- ============================================
-- DATOS DE PRUEBA OPCIONALES
-- ============================================
-- Puedes descomentar estas líneas para probar diferentes estados

/*
-- Ejemplo 1: Negocio cerrado manualmente
UPDATE sellers SET is_open_now = false WHERE id = 'tu-seller-id-aqui';

-- Ejemplo 2: Negocio con horarios específicos
UPDATE sellers SET 
    weekly_hours = '{
        "monday": {"open": "09:00", "close": "18:00"},
        "tuesday": {"open": "09:00", "close": "18:00"},
        "wednesday": {"open": "09:00", "close": "18:00"},
        "thursday": {"open": "09:00", "close": "18:00"},
        "friday": {"open": "09:00", "close": "18:00"},
        "saturday": {"open": "10:00", "close": "16:00"},
        "sunday": null
    }'::jsonb 
WHERE id = 'tu-seller-id-aqui';

-- Ejemplo 3: Restaurar negocio a abierto
UPDATE sellers SET is_open_now = true WHERE id = 'tu-seller-id-aqui';
*/

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
    'sellers' as table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sellers' 
    AND column_name IN ('is_open_now', 'weekly_hours')
ORDER BY column_name;