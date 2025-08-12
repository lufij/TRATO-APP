-- =====================================================
-- DIAGNÓSTICO SIMPLE SIN CARACTERES ESPECIALES
-- =====================================================
-- Version simplificada para evitar errores de codificación

SELECT 'DIAGNOSTICO RAPIDO DEL SISTEMA DE ORDENES TRATO' as titulo;
SELECT 'Ejecutado en: ' || NOW() as timestamp;

-- =====================================================
-- 1. VERIFICAR TABLAS BÁSICAS VS NUEVAS
-- =====================================================

WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'users', 'sellers', 'drivers', 'products', 
        'daily_products', 'cart_items', 'orders', 
        'order_items', 'notifications', 'reviews'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
)
SELECT 
    'ESTADO DE TABLAS' as categoria,
    et.table_name as tabla,
    CASE 
        WHEN et.table_name IN ('orders', 'order_items', 'notifications', 'reviews') 
        THEN 'SISTEMA DE ORDENES'
        ELSE 'SISTEMA BASE'
    END as sistema,
    CASE 
        WHEN ext.table_name IS NOT NULL THEN 'EXISTE'
        ELSE 'FALTA'
    END as estado,
    CASE 
        WHEN et.table_name IN ('orders', 'order_items', 'notifications', 'reviews') 
             AND ext.table_name IS NULL
        THEN 'CRITICA - Necesaria para carrito/ordenes'
        WHEN ext.table_name IS NULL 
        THEN 'IMPORTANTE - Funcionalidad limitada'
        ELSE 'OK'
    END as importancia
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY 
    CASE WHEN ext.table_name IS NULL THEN 0 ELSE 1 END,
    et.table_name;

-- =====================================================
-- 2. VERIFICAR COLUMNAS CRÍTICAS
-- =====================================================

-- Verificar delivery_type en orders (crítico para el carrito)
SELECT 
    'VERIFICACION DELIVERY_TYPE' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'orders'
        ) THEN
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'orders' AND column_name = 'delivery_type'
                ) THEN 'delivery_type existe en orders'
                ELSE 'delivery_type NO EXISTE en orders'
            END
        ELSE 'Tabla orders NO EXISTE'
    END as resultado,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'orders'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'delivery_type'
        ) THEN 'PERFECTO'
        ELSE 'CRITICO - Sin esto el carrito no funciona'
    END as impacto;

-- =====================================================
-- 3. CONTAR COMPONENTES DEL SISTEMA
-- =====================================================

-- Contar tablas
SELECT 
    'RESUMEN CUANTITATIVO' as categoria,
    'Tablas totales' as componente,
    COUNT(*) as cantidad,
    '10 esperadas' as esperado,
    CASE 
        WHEN COUNT(*) = 10 THEN 'COMPLETO'
        WHEN COUNT(*) >= 6 THEN 'PARCIAL'
        ELSE 'INCOMPLETO'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'sellers', 'drivers', 'products', 'daily_products', 'cart_items', 'orders', 'order_items', 'notifications', 'reviews');

-- Contar políticas de seguridad
SELECT 
    'RESUMEN CUANTITATIVO' as categoria,
    'Políticas RLS' as componente,
    COUNT(*) as cantidad,
    '20+ esperadas' as esperado,
    CASE 
        WHEN COUNT(*) >= 20 THEN 'COMPLETO'
        WHEN COUNT(*) >= 10 THEN 'PARCIAL'
        ELSE 'INCOMPLETO'
    END as estado
FROM pg_policies 
WHERE schemaname = 'public';

-- =====================================================
-- 4. IDENTIFICAR PRÓXIMOS PASOS
-- =====================================================

WITH diagnostics AS (
    SELECT 
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN 1 
            ELSE 0 
        END as has_orders,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN 1 
            ELSE 0 
        END as has_notifications,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'delivery_type'
            ) THEN 1 
            ELSE 0 
        END as has_delivery_type
)
SELECT 
    'PROXIMOS PASOS RECOMENDADOS' as categoria,
    CASE 
        WHEN has_orders = 0 THEN 
            '1. URGENTE: Ejecutar /database/update_orders_system_complete_fixed.sql'
        WHEN has_orders = 1 AND has_delivery_type = 0 THEN
            '1. Re-ejecutar /database/update_orders_system_complete_fixed.sql (script incompleto)'
        WHEN has_orders = 1 AND has_notifications = 1 AND has_delivery_type = 1 THEN
            '1. Verificar Realtime activo para orders y notifications'
        ELSE 
            '1. Ejecutar verificación completa'
    END as paso_1,
    CASE 
        WHEN has_orders = 0 THEN 
            '2. Esperar a que termine y verificar'
        WHEN has_orders = 1 AND has_delivery_type = 0 THEN
            '2. Esperar y verificar que delivery_type se creó correctamente'
        WHEN has_orders = 1 AND has_notifications = 1 AND has_delivery_type = 1 THEN
            '2. Recargar aplicación (Ctrl+Shift+R)'
        ELSE 
            '2. Revisar errores en la consola'
    END as paso_2,
    CASE 
        WHEN has_orders = 1 AND has_notifications = 1 AND has_delivery_type = 1 THEN
            '3. Disfrutar del marketplace completo!'
        ELSE 
            '3. Ejecutar diagnostic_simple.sql nuevamente'
    END as paso_3
FROM diagnostics;

-- =====================================================
-- 5. ESTADO FINAL Y RECOMENDACIONES
-- =====================================================

WITH system_status AS (
    SELECT 
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name IN ('orders', 'order_items', 'notifications', 'reviews')) as new_tables,
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name IN ('users', 'sellers', 'drivers', 'products', 'daily_products', 'cart_items')) as base_tables,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'orders' AND column_name = 'delivery_type') as delivery_type_exists
)
SELECT 
    'DIAGNOSTICO FINAL' as categoria,
    CASE 
        WHEN new_tables = 4 AND base_tables = 6 AND delivery_type_exists = 1 THEN
            'SISTEMA COMPLETO - Todo perfecto!'
        WHEN new_tables = 0 AND base_tables >= 4 THEN
            'SISTEMA BASE - Necesitas actualizar con sistema de ordenes'
        WHEN new_tables > 0 AND new_tables < 4 THEN
            'SISTEMA PARCIAL - Actualización incompleta, re-ejecutar script'
        WHEN base_tables < 4 THEN
            'SISTEMA BASICO INCOMPLETO - Ejecutar fix_setup.sql primero'
        ELSE
            'ESTADO DESCONOCIDO - Revisar manualmente'
    END as estado_general,
    new_tables || '/4 nuevas tablas' as tablas_nuevas,
    base_tables || '/6 tablas base' as tablas_base,
    CASE 
        WHEN delivery_type_exists = 1 THEN 'delivery_type OK'
        ELSE 'delivery_type falta'
    END as columnas_criticas,
    CASE 
        WHEN new_tables = 4 AND base_tables = 6 AND delivery_type_exists = 1 THEN
            'Activar Realtime y recargar app'
        WHEN new_tables = 0 THEN
            'Ejecutar update_orders_system_complete_fixed.sql'
        ELSE
            'Re-ejecutar update_orders_system_complete_fixed.sql'
    END as accion_recomendada
FROM system_status;

SELECT 'DIAGNOSTICO COMPLETADO' as resultado;
SELECT 'Si todo esta OK, activa Realtime y recarga tu app' as siguiente_paso;