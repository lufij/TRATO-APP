-- =====================================================
-- VERIFICACIÓN RÁPIDA DE LA CORRECCIÓN DEL CARRITO
-- =====================================================
-- Ejecuta este script DESPUÉS de fix_cart_foreign_key_error_corrected.sql

SELECT 'VERIFICACIÓN DE LA CORRECCIÓN DEL CARRITO' as titulo;

-- =====================================================
-- 1. VERIFICAR COLUMNAS NUEVAS EN CART_ITEMS
-- =====================================================

SELECT 
    'COLUMNAS DE CART_ITEMS' as categoria,
    column_name as columna,
    data_type as tipo,
    CASE 
        WHEN column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id') 
        THEN 'NUEVA - Para carrito profesional'
        ELSE 'EXISTENTE'
    END as estado
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'cart_items'
ORDER BY 
    CASE 
        WHEN column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id') 
        THEN 0 ELSE 1 
    END,
    column_name;

-- =====================================================
-- 2. VERIFICAR FUNCIONES CREADAS
-- =====================================================

SELECT 
    'FUNCIONES DEL CARRITO' as categoria,
    proname as nombre_funcion,
    CASE 
        WHEN proname = 'get_product_details' THEN 'Valida y obtiene datos del producto'
        WHEN proname = 'add_to_cart_safe' THEN 'Agregar al carrito con validación'
        WHEN proname = 'cleanup_invalid_cart_items' THEN 'Limpieza automática de items inválidos'
        ELSE 'Otra función'
    END as proposito,
    'CREADA' as estado
FROM pg_proc 
WHERE proname IN ('get_product_details', 'add_to_cart_safe', 'cleanup_invalid_cart_items')
ORDER BY proname;

-- =====================================================
-- 3. PROBAR FUNCIÓN GET_PRODUCT_DETAILS
-- =====================================================

-- Crear un producto temporal para probar
DO $$
DECLARE
    test_product_id UUID;
    test_result RECORD;
BEGIN
    -- Solo si hay un usuario vendedor disponible
    SELECT id INTO test_product_id FROM public.products LIMIT 1;
    
    IF test_product_id IS NOT NULL THEN
        -- Probar función con producto existente
        SELECT * INTO test_result FROM get_product_details(test_product_id, 'regular');
        
        IF test_result.product_exists THEN
            RAISE NOTICE '%', '✓ Función get_product_details funciona correctamente';
            RAISE NOTICE '%', format('  Producto encontrado: %s', test_result.name);
        ELSE
            RAISE NOTICE '%', '⚠ Función get_product_details retorna que no existe';
        END IF;
    ELSE
        RAISE NOTICE '%', '⚠ No hay productos para probar get_product_details';
    END IF;
    
    -- Probar con producto inexistente
    SELECT * INTO test_result FROM get_product_details('00000000-0000-0000-0000-000000000000'::UUID, 'regular');
    
    IF NOT test_result.product_exists THEN
        RAISE NOTICE '%', '✓ Función maneja correctamente productos inexistentes';
    ELSE
        RAISE NOTICE '%', '⚠ Error: función no detecta productos inexistentes';
    END IF;
END $$;

-- =====================================================
-- 4. VERIFICAR ÍNDICES NUEVOS
-- =====================================================

SELECT 
    'ÍNDICES DEL CARRITO' as categoria,
    indexname as nombre_indice,
    tablename as tabla,
    CASE 
        WHEN indexname LIKE '%seller_id%' THEN 'Para vendedor único'
        WHEN indexname LIKE '%product_type%' THEN 'Para productos mixtos'
        ELSE 'Optimización general'
    END as proposito
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'cart_items'
AND indexname LIKE 'idx_cart_items_%'
ORDER BY indexname;

-- =====================================================
-- 5. VERIFICAR TRIGGERS
-- =====================================================

SELECT 
    'TRIGGERS DE LIMPIEZA' as categoria,
    trigger_name as nombre_trigger,
    event_object_table as tabla,
    'Auto-limpieza del carrito' as proposito
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND trigger_name LIKE '%cleanup_cart%'
ORDER BY trigger_name;

-- =====================================================
-- 6. RESULTADO FINAL
-- =====================================================

WITH verification AS (
    SELECT 
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'cart_items'
         AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id')) as new_columns,
        (SELECT COUNT(*) FROM pg_proc 
         WHERE proname IN ('get_product_details', 'add_to_cart_safe', 'cleanup_invalid_cart_items')) as functions_created,
        (SELECT COUNT(*) FROM pg_indexes 
         WHERE schemaname = 'public' AND tablename = 'cart_items'
         AND indexname LIKE '%seller_id%' OR indexname LIKE '%product_type%') as new_indexes
)
SELECT 
    'RESULTADO FINAL' as categoria,
    CASE 
        WHEN new_columns = 5 AND functions_created = 3 AND new_indexes >= 2 THEN
            'CORRECCIÓN COMPLETADA EXITOSAMENTE'
        WHEN new_columns < 5 THEN
            format('FALTAN COLUMNAS: %s/5 creadas', new_columns)
        WHEN functions_created < 3 THEN
            format('FALTAN FUNCIONES: %s/3 creadas', functions_created)
        ELSE
            'VERIFICAR MANUALMENTE'
    END as estado,
    format('%s/5 columnas nuevas', new_columns) as columnas,
    format('%s/3 funciones', functions_created) as funciones,
    format('%s índices nuevos', new_indexes) as indices
FROM verification;

-- =====================================================
-- 7. INSTRUCCIONES FINALES
-- =====================================================

SELECT 
    'PRÓXIMOS PASOS' as categoria,
    'Si todo está OK, ahora puedes:' as instruccion_1,
    '1. Recargar tu aplicación (Ctrl+Shift+R)' as paso_1,
    '2. Probar agregar productos al carrito' as paso_2,
    '3. Verificar que no aparezcan errores de foreign key' as paso_3,
    '4. Confirmar que aparecen toasts de éxito/error' as paso_4;

SELECT 'VERIFICACIÓN COMPLETADA' as resultado;