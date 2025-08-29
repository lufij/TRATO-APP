-- =====================================================
-- 🔍 DIAGNÓSTICO SIMPLE - PASO A PASO
-- =====================================================
-- Ejecutar UNA consulta a la vez para identificar el problema

-- PASO 1: ¿Existe el trigger?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_update_stock_on_order_confirm'
        ) THEN '✅ TRIGGER EXISTE'
        ELSE '❌ TRIGGER NO EXISTE - ESTA ES LA CAUSA'
    END as "Resultado Trigger";
