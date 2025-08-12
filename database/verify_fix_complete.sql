-- =====================================================
-- VERIFICACIÓN RÁPIDA POST-FIX
-- =====================================================
-- Ejecuta este script DESPUÉS de fix_all_foreign_key_errors_clean.sql
-- para confirmar que todo está funcionando correctamente

SELECT 'VERIFICACIÓN POST-CORRECCIÓN INICIADA' as status;

-- =====================================================
-- 1. VERIFICAR FOREIGN KEYS DE ORDERS
-- =====================================================

WITH orders_fks AS (
    SELECT 
        kcu.column_name,
        ccu.table_name as referenced_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'orders' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id')
)
SELECT 
    'ORDERS FOREIGN KEYS' as categoria,
    CASE 
        WHEN COUNT(*) = 3 THEN 'CORRECTO - Todos los FKs creados'
        ELSE format('REVISAR - Solo %s de 3 FKs encontrados', COUNT(*))
    END as estado,
    string_agg(column_name || ' → ' || referenced_table, ', ') as foreign_keys_encontrados
FROM orders_fks;

-- =====================================================
-- 2. VERIFICAR QUE CART NO TIENE FKS PROBLEMÁTICOS  
-- =====================================================

WITH cart_problematic_fks AS (
    SELECT COUNT(*) as fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'product_id'
)
SELECT 
    'CART FOREIGN KEY PROBLEMÁTICO' as categoria,
    CASE 
        WHEN fk_count = 0 THEN 'CORRECTO - Constraint problemático eliminado'
        ELSE format('PROBLEMA - Aún hay %s constraint problemático', fk_count)
    END as estado,
    fk_count as cantidad_fks_problematicos
FROM cart_problematic_fks;

-- =====================================================
-- 3. VERIFICAR CART TIENE FK SEGURO (user_id)
-- =====================================================

WITH cart_safe_fks AS (
    SELECT COUNT(*) as fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
)
SELECT 
    'CART FOREIGN KEY SEGURO (user_id)' as categoria,
    CASE 
        WHEN fk_count = 1 THEN 'CORRECTO - FK user_id existe'
        WHEN fk_count = 0 THEN 'PROBLEMA - FK user_id falta'
        ELSE format('REVISAR - %s FKs user_id (esperado: 1)', fk_count)
    END as estado,
    fk_count as cantidad_fks_seguros
FROM cart_safe_fks;

-- =====================================================
-- 4. VERIFICAR FUNCIONES DE CARRITO CREADAS
-- =====================================================

WITH cart_functions AS (
    SELECT 
        proname as function_name,
        CASE 
            WHEN proname = 'add_to_cart_safe' THEN 'Función principal para agregar al carrito'
            WHEN proname = 'validate_and_get_product_data' THEN 'Validación de productos'
            WHEN proname = 'cleanup_invalid_cart_items' THEN 'Limpieza automática'
            ELSE 'Función desconocida'
        END as descripcion
    FROM pg_proc 
    WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items')
)
SELECT 
    'FUNCIONES DE CARRITO' as categoria,
    CASE 
        WHEN COUNT(*) = 3 THEN 'CORRECTO - Todas las funciones creadas'
        ELSE format('PROBLEMA - Solo %s de 3 funciones encontradas', COUNT(*))
    END as estado,
    COUNT(*) as funciones_encontradas,
    string_agg(function_name || ' (' || descripcion || ')', ', ') as detalle_funciones
FROM cart_functions;

-- =====================================================
-- 5. VERIFICAR COLUMNAS NUEVAS EN CART_ITEMS
-- =====================================================

WITH cart_new_columns AS (
    SELECT 
        column_name,
        data_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cart_items'
    AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id')
)
SELECT 
    'COLUMNAS NUEVAS EN CART_ITEMS' as categoria,
    CASE 
        WHEN COUNT(*) = 5 THEN 'CORRECTO - Todas las columnas agregadas'
        ELSE format('PROBLEMA - Solo %s de 5 columnas encontradas', COUNT(*))
    END as estado,
    COUNT(*) as columnas_encontradas,
    string_agg(column_name || ' (' || data_type || ')', ', ') as detalle_columnas
FROM cart_new_columns;

-- =====================================================
-- 6. VERIFICAR TABLAS DEL SISTEMA ORDERS
-- =====================================================

WITH orders_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('orders', 'order_items', 'notifications', 'reviews')
)
SELECT 
    'TABLAS DEL SISTEMA ORDERS' as categoria,
    CASE 
        WHEN COUNT(*) = 4 THEN 'CORRECTO - Todas las tablas existen'
        ELSE format('PROBLEMA - Solo %s de 4 tablas encontradas', COUNT(*))
    END as estado,
    COUNT(*) as tablas_encontradas,
    string_agg(table_name, ', ') as tablas_existentes
FROM orders_tables;

-- =====================================================
-- 7. PROBAR FUNCIÓN ADD_TO_CART_SAFE
-- =====================================================

DO $$
DECLARE
    test_result RECORD;
    test_user_id UUID;
BEGIN
    -- Obtener un usuario existente para probar
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Probar la función con un producto inexistente (debería fallar elegantemente)
        SELECT * INTO test_result 
        FROM add_to_cart_safe(
            test_user_id, 
            '00000000-0000-0000-0000-000000000000'::UUID, 
            1, 
            'regular'
        );
        
        IF test_result.success = false THEN
            RAISE NOTICE 'FUNCIÓN ADD_TO_CART_SAFE: CORRECTO - Rechaza productos inexistentes';
        ELSE
            RAISE NOTICE 'FUNCIÓN ADD_TO_CART_SAFE: PROBLEMA - No valida correctamente';
        END IF;
    ELSE
        RAISE NOTICE 'FUNCIÓN ADD_TO_CART_SAFE: NO SE PUEDE PROBAR - No hay usuarios en la base de datos';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'FUNCIÓN ADD_TO_CART_SAFE: ERROR - %', SQLERRM;
END $$;

-- =====================================================
-- 8. RESULTADO FINAL CONSOLIDADO
-- =====================================================

WITH verification_summary AS (
    SELECT 
        -- Orders FKs
        (SELECT COUNT(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'orders' AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id')) as orders_fks,
        
        -- Cart problematic FKs (should be 0)
        (SELECT COUNT(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'product_id') as cart_bad_fks,
        
        -- Cart safe FKs (should be 1)
        (SELECT COUNT(*) FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'user_id') as cart_good_fks,
        
        -- Functions
        (SELECT COUNT(*) FROM pg_proc 
         WHERE proname IN ('add_to_cart_safe', 'validate_and_get_product_data', 'cleanup_invalid_cart_items')) as functions_count,
        
        -- New columns
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'cart_items'
         AND column_name IN ('product_type', 'product_name', 'product_price', 'product_image', 'seller_id')) as new_columns,
        
        -- Tables
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name IN ('orders', 'order_items', 'notifications', 'reviews')) as orders_tables
)
SELECT 
    'RESUMEN FINAL DE VERIFICACIÓN' as categoria,
    CASE 
        WHEN orders_fks = 3 AND cart_bad_fks = 0 AND cart_good_fks = 1 
             AND functions_count = 3 AND new_columns = 5 AND orders_tables = 4 THEN
            'ÉXITO COMPLETO - Todos los errores de foreign key solucionados'
        ELSE
            'REVISAR - Algunos elementos necesitan atención'
    END as estado_general,
    format('Orders FKs: %s/3, Cart bad FKs: %s/0, Cart good FKs: %s/1, Functions: %s/3, Columns: %s/5, Tables: %s/4', 
           orders_fks, cart_bad_fks, cart_good_fks, functions_count, new_columns, orders_tables) as detalle_completo
FROM verification_summary;

-- =====================================================
-- 9. INSTRUCCIONES FINALES
-- =====================================================

SELECT 
    'INSTRUCCIONES FINALES' as categoria,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
              WHERE tc.table_name = 'orders' AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name IN ('buyer_id', 'seller_id', 'driver_id')) = 3
        AND (SELECT COUNT(*) FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
             WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY'
             AND kcu.column_name = 'product_id') = 0 THEN
            '1. Activa Realtime para tablas "orders" y "notifications" en Supabase Dashboard | 2. Reinicia aplicación con Ctrl+Shift+R | 3. Prueba agregar productos al carrito | 4. ¡Tu TRATO está listo para usar!'
        ELSE
            'Hay problemas pendientes. Revisa el detalle arriba y considera re-ejecutar el script fix_all_foreign_key_errors_clean.sql'
    END as siguiente_paso;

SELECT 'VERIFICACIÓN COMPLETADA' as final_status;