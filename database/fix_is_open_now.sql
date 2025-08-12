-- =====================================================
-- FIX RÁPIDO: Agregar columna is_open_now faltante
-- =====================================================
-- Este script agrega solo la columna is_open_now que falta
-- para que funcione el botón de abrir/cerrar negocio

BEGIN;

-- Agregar columna is_open_now si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'sellers' 
                   AND column_name = 'is_open_now') THEN
        
        ALTER TABLE public.sellers ADD COLUMN is_open_now BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE '✅ Columna is_open_now agregada exitosamente';
        RAISE NOTICE '   Los vendedores ahora pueden abrir/cerrar su negocio manualmente';
    ELSE
        RAISE NOTICE 'ℹ️  La columna is_open_now ya existe';
    END IF;
END $$;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_sellers_is_open_now ON public.sellers(is_open_now);

-- Verificar que la columna existe
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sellers' 
        AND column_name = 'is_open_now'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '==========================================';
        RAISE NOTICE '✅ COLUMNA is_open_now CONFIGURADA CORRECTAMENTE';
        RAISE NOTICE '==========================================';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 El botón ABRIR/CERRAR NEGOCIO ya funciona!';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Funcionalidades habilitadas:';
        RAISE NOTICE '   - ✅ Abrir/cerrar negocio manualmente';
        RAISE NOTICE '   - ✅ Override de horarios programados';
        RAISE NOTICE '   - ✅ Estado visible para clientes';
        RAISE NOTICE '';
        RAISE NOTICE '🔄 Recarga tu aplicación para ver los cambios';
        RAISE NOTICE '==========================================';
    ELSE
        RAISE NOTICE '❌ Error: La columna no se pudo crear';
    END IF;
END $$;

COMMIT;