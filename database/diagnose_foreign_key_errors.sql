-- =====================================================
-- DIAGNÓSTICO COMPLETO DE ERRORES DE FOREIGN KEY
-- =====================================================
-- Este script diagnostica los errores específicos reportados:
-- 1. "Could not find a relationship between 'orders' and 'users'"
-- 2. "cart_items violates foreign key constraint"

SELECT 'DIAGNÓSTICO DE FOREIGN KEY ERRORS - TRATO' as diagnostico_inicio;
SELECT 'Ejecutado en: ' || NOW() as timestamp;

-- =====================================================
-- 1. VERIFICAR EXISTENCIA DE TABLAS CRÍTICAS
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
    'ESTADO DE TABLAS CRÍTICAS' as categoria,
    et.table_name as tabla,
    CASE 
        WHEN et.table_name IN ('orders', 'cart_items') 
        THEN 'CRÍTICA PARA ERRORES REPORTADOS'
        WHEN et.table_name IN ('users', 'products', 'daily_products')
        THEN 'TABLA BASE REQUERIDA'
        ELSE 'TABLA ADICIONAL'
    END as importancia,
    CASE 
        WHEN ext.table_name IS NOT NULL THEN 'EXISTE'
        ELSE 'FALTA - CRÍTICO'
    END as estado
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY 
    CASE WHEN ext.table_name IS NULL THEN 0 ELSE 1 END,
    et.table_name;

-- =====================================================
-- 2. VERIFICAR FOREIGN KEY CONSTRAINTS EXISTENTES
-- =====================================================

SELECT 
    'FOREIGN KEY CONSTRAINTS ACTUALES' as categoria,
    tc.table_name as tabla_origen,
    kcu.column_name as columna_origen,
    ccu.table_name as tabla_destino,
    ccu.column_name as columna_destino,
    tc.constraint_name as nombre_constraint,
    CASE 
        WHEN tc.table_name = 'orders' AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id') THEN 'CRÍTICO - Para error orders'
        WHEN tc.table_name = 'cart_items' AND kcu.column_name = 'product_id' THEN 'CRÍTICO - Para error cart'
        WHEN tc.table_name = 'cart_items' AND kcu.column_name IN ('user_id', 'seller_id') THEN 'IMPORTANTE - Para cart'
        ELSE 'NORMAL'
    END as criticidad
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY 
    CASE 
        WHEN tc.table_name = 'orders' AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id') THEN 0
        WHEN tc.table_name = 'cart_items' THEN 1
        ELSE 2
    END,
    tc.table_name,
    kcu.column_name;

-- =====================================================
-- 3. VERIFICAR ESTRUCTURA ESPECÍFICA DE ORDERS
-- =====================================================

DO $$
BEGIN
    -- Verificar si la tabla orders existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '%', '=== ESTRUCTURA DE TABLA ORDERS ===';
        
        -- Verificar columnas críticas
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'buyer_id') THEN
            RAISE NOTICE '%', '✓ orders.buyer_id existe';
        ELSE
            RAISE NOTICE '%', '❌ orders.buyer_id NO EXISTE';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'seller_id') THEN
            RAISE NOTICE '%', '✓ orders.seller_id existe';
        ELSE
            RAISE NOTICE '%', '❌ orders.seller_id NO EXISTE';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'driver_id') THEN
            RAISE NOTICE '%', '✓ orders.driver_id existe';
        ELSE
            RAISE NOTICE '%', '❌ orders.driver_id NO EXISTE';
        END IF;
        
        -- Verificar foreign keys específicos de orders
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'orders' AND kcu.column_name = 'buyer_id' AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN
            RAISE NOTICE '%', '✓ orders.buyer_id tiene FOREIGN KEY a users';
        ELSE
            RAISE NOTICE '%', '❌ orders.buyer_id SIN FOREIGN KEY - ESTO CAUSA EL ERROR';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'orders' AND kcu.column_name = 'seller_id' AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN
            RAISE NOTICE '%', '✓ orders.seller_id tiene FOREIGN KEY a users';
        ELSE
            RAISE NOTICE '%', '❌ orders.seller_id SIN FOREIGN KEY - ESTO CAUSA EL ERROR';
        END IF;
        
    ELSE
        RAISE NOTICE '%', '❌ TABLA ORDERS NO EXISTE - ERROR CRÍTICO';
    END IF;
END $$;

-- =====================================================
-- 4. VERIFICAR ESTRUCTURA ESPECÍFICA DE CART_ITEMS
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        RAISE NOTICE '%', '=== ESTRUCTURA DE TABLA CART_ITEMS ===';
        
        -- Verificar columnas críticas
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_id') THEN
            RAISE NOTICE '%', '✓ cart_items.product_id existe';
        ELSE
            RAISE NOTICE '%', '❌ cart_items.product_id NO EXISTE';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_type') THEN
            RAISE NOTICE '%', '✓ cart_items.product_type existe (necesaria para fix)';
        ELSE
            RAISE NOTICE '%', '⚠ cart_items.product_type NO EXISTE - necesaria para fix';
        END IF;
        
        -- Verificar foreign keys de cart_items
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'product_id' AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN
            RAISE NOTICE '%', '⚠ cart_items.product_id tiene FOREIGN KEY rígido - ESTO CAUSA EL ERROR';
        ELSE
            RAISE NOTICE '%', '✓ cart_items.product_id SIN foreign key rígido (mejor para productos mixtos)';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'user_id' AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN
            RAISE NOTICE '%', '✓ cart_items.user_id tiene FOREIGN KEY a users';
        ELSE
            RAISE NOTICE '%', '❌ cart_items.user_id SIN FOREIGN KEY';
        END IF;
        
    ELSE
        RAISE NOTICE '%', '❌ TABLA CART_ITEMS NO EXISTE';
    END IF;
END $$;

-- =====================================================
-- 5. VERIFICAR FUNCIONES DE CARRITO SEGURO
-- =====================================================

SELECT 
    'FUNCIONES PARA CARRITO SEGURO' as categoria,
    proname as nombre_funcion,
    CASE 
        WHEN proname = 'add_to_cart_safe' THEN 'CRÍTICA - Validación de carrito'
        WHEN proname = 'get_product_details' THEN 'CRÍTICA - Obtener datos producto'
        WHEN proname = 'cleanup_invalid_cart_items' THEN 'IMPORTANTE - Limpieza'
        ELSE 'DESCONOCIDA'
    END as proposito,
    'EXISTE' as estado
FROM pg_proc 
WHERE proname IN ('add_to_cart_safe', 'get_product_details', 'cleanup_invalid_cart_items')
UNION ALL
SELECT 
    'FUNCIONES PARA CARRITO SEGURO' as categoria,
    funcion_faltante as nombre_funcion,
    'FALTA - NECESARIA' as proposito,
    'NO EXISTE' as estado
FROM (
    SELECT unnest(ARRAY['add_to_cart_safe', 'get_product_details', 'cleanup_invalid_cart_items']) as funcion_faltante
) f
WHERE funcion_faltante NOT IN (
    SELECT proname FROM pg_proc 
    WHERE proname IN ('add_to_cart_safe', 'get_product_details', 'cleanup_invalid_cart_items')
);

-- =====================================================
-- 6. ANÁLISIS DE CAUSA RAÍZ
-- =====================================================

WITH diagnosis AS (
    SELECT 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN 1 ELSE 0 END as orders_exists,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN 1 ELSE 0 END as cart_exists,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'orders' AND kcu.column_name = 'seller_id' AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN 1 ELSE 0 END as orders_fk_exists,
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'add_to_cart_safe'
        ) THEN 1 ELSE 0 END as cart_safe_function_exists,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'product_type'
        ) THEN 1 ELSE 0 END as cart_product_type_exists
)
SELECT 
    'ANÁLISIS DE CAUSA RAÍZ' as categoria,
    CASE 
        WHEN orders_exists = 0 THEN
            'CAUSA: Tabla orders no existe. SOLUCIÓN: Ejecutar update_orders_system_complete_fixed.sql'
        WHEN orders_exists = 1 AND orders_fk_exists = 0 THEN
            'CAUSA: Tabla orders existe pero sin foreign keys. SOLUCIÓN: Crear foreign keys'
        WHEN cart_exists = 1 AND cart_safe_function_exists = 0 THEN
            'CAUSA: cart_items existe pero sin funciones seguras. SOLUCIÓN: Ejecutar fix_cart_foreign_key_error_corrected.sql'
        WHEN cart_exists = 1 AND cart_product_type_exists = 0 THEN
            'CAUSA: cart_items sin columna product_type. SOLUCIÓN: Actualizar estructura'
        WHEN orders_exists = 1 AND cart_safe_function_exists = 1 THEN
            'POSIBLE CAUSA: Scripts ejecutados pero problemas de realtime/cache. SOLUCIÓN: Reiniciar aplicación'
        ELSE
            'CAUSA DESCONOCIDA: Revisar logs detallados'
    END as diagnostico_principal,
    
    format('orders_exists: %s, orders_fk: %s, cart_safe_func: %s, cart_product_type: %s', 
           orders_exists, orders_fk_exists, cart_safe_function_exists, cart_product_type_exists) as estado_detallado
FROM diagnosis;

-- =====================================================
-- 7. RECOMENDACIONES ESPECÍFICAS
-- =====================================================

SELECT 
    'RECOMENDACIONES ESPECÍFICAS' as categoria,
    '1. Para error "Could not find relationship orders/users":' as error_1,
    '   → Ejecutar: /database/fix_orders_foreign_keys.sql (crear este archivo)' as solucion_1,
    '2. Para error "cart_items violates foreign key constraint":' as error_2,
    '   → Ejecutar: /database/fix_cart_foreign_key_error_corrected.sql' as solucion_2,
    '3. Después de ambos scripts:' as paso_final,
    '   → Reiniciar aplicación completamente (Ctrl+Shift+R)' as accion_final;

SELECT 'DIAGNÓSTICO COMPLETADO - Ver recomendaciones arriba' as resultado;