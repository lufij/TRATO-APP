-- ============================================
-- REVERSIÓN URGENTE - ACTIVAR TODOS LOS PRODUCTOS
-- ============================================
-- Este script revierte el error anterior que desactivó todos los productos

DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Activar todos los sellers que fueron desactivados por error
    UPDATE sellers SET is_open_now = true;
    
    -- Contar cuántos se activaron
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '✅ Se activaron % sellers', affected_rows;
    
    -- Verificar el estado actual
    RAISE NOTICE '🔍 Estado actual de sellers:';
    
    -- Mostrar resumen del estado
    PERFORM CASE 
        WHEN COUNT(*) FILTER (WHERE is_open_now = true) > 0 THEN
            RAISE NOTICE '   ✅ Sellers activos: %', COUNT(*) FILTER (WHERE is_open_now = true)
        ELSE
            RAISE NOTICE '   ❌ No hay sellers activos'
    END
    FROM sellers;
    
    PERFORM CASE 
        WHEN COUNT(*) FILTER (WHERE is_open_now = false) > 0 THEN
            RAISE NOTICE '   ⭕ Sellers inactivos: %', COUNT(*) FILTER (WHERE is_open_now = false)
        ELSE
            RAISE NOTICE '   ✅ Todos los sellers están activos'
    END
    FROM sellers;
    
    RAISE NOTICE '✅ REVERSIÓN COMPLETADA - Todos los productos deben estar disponibles ahora';
END $$;

-- Verificación final
SELECT 
    id,
    business_name,
    is_open_now,
    weekly_hours IS NOT NULL as has_schedule
FROM sellers 
ORDER BY business_name;