-- ============================================================================
-- TRATO - Corrección Simple Solo para price_per_unit
-- ============================================================================
-- Este script agrega ÚNICAMENTE la columna price_per_unit que está faltando
-- SIN triggers ni funciones complicadas para evitar errores de sintaxis
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🛠️ CORRECCIÓN SIMPLE PARA price_per_unit...';
    RAISE NOTICE '';
    RAISE NOTICE 'Este script agrega SOLO la columna price_per_unit que está faltando.';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICAR Y AGREGAR COLUMNA price_per_unit
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 VERIFICANDO Y AGREGANDO price_per_unit:';
    
    -- Verificar si la tabla order_items existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE '   ❌ ERROR: Tabla order_items no existe';
        RAISE NOTICE '   💡 Ejecuta fix_order_items_columns_corrected.sql primero';
        RETURN;
    END IF;
    
    RAISE NOTICE '   ✅ Tabla order_items existe';
    
    -- Verificar si la columna price_per_unit ya existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') THEN
        RAISE NOTICE '   ✅ Columna price_per_unit ya existe';
    ELSE
        RAISE NOTICE '   ➕ Agregando columna price_per_unit...';
        
        BEGIN
            ALTER TABLE order_items ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0;
            RAISE NOTICE '   ✅ Columna price_per_unit agregada exitosamente';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Error agregando price_per_unit: %', SQLERRM;
        END;
    END IF;
    
    -- Verificar si la columna total_price existe (también necesaria)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') THEN
        RAISE NOTICE '   ✅ Columna total_price ya existe';
    ELSE
        RAISE NOTICE '   ➕ Agregando columna total_price...';
        
        BEGIN
            ALTER TABLE order_items ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0;
            RAISE NOTICE '   ✅ Columna total_price agregada exitosamente';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Error agregando total_price: %', SQLERRM;
        END;
    END IF;
    
    -- Verificar si la columna quantity existe
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') THEN
        RAISE NOTICE '   ✅ Columna quantity ya existe';
    ELSE
        RAISE NOTICE '   ➕ Agregando columna quantity...';
        
        BEGIN
            ALTER TABLE order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
            RAISE NOTICE '   ✅ Columna quantity agregada exitosamente';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Error agregando quantity: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST SIMPLE DE VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    price_per_unit_exists BOOLEAN := FALSE;
    total_price_exists BOOLEAN := FALSE;
    quantity_exists BOOLEAN := FALSE;
    test_works BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔍 TEST SIMPLE DE VERIFICACIÓN:';
    
    -- Verificar columnas
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_per_unit') 
    INTO price_per_unit_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') 
    INTO total_price_exists;
    
    SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'quantity') 
    INTO quantity_exists;
    
    -- Probar query que estaba fallando
    BEGIN
        PERFORM price_per_unit, total_price, quantity FROM order_items LIMIT 1;
        test_works := TRUE;
        RAISE NOTICE '   ✅ Query SELECT con price_per_unit: FUNCIONA';
    EXCEPTION WHEN OTHERS THEN
        test_works := FALSE;
        RAISE NOTICE '   ❌ Query SELECT con price_per_unit: ERROR - %', SQLERRM;
    END;
    
    -- Mostrar resultados
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESULTADOS:';
    RAISE NOTICE '   price_per_unit: %', CASE WHEN price_per_unit_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   total_price: %', CASE WHEN total_price_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   quantity: %', CASE WHEN quantity_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '   Query funciona: %', CASE WHEN test_works THEN '✅ SÍ' ELSE '❌ NO' END;
    
    IF price_per_unit_exists AND total_price_exists AND quantity_exists AND test_works THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ¡CORRECCIÓN SIMPLE EXITOSA!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ El error "column order_items_1.price_per_unit does not exist" está solucionado';
        RAISE NOTICE '📱 Recarga la aplicación TRATO para confirmar';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ CORRECCIÓN INCOMPLETA - ejecuta fix_order_items_columns_corrected.sql';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CORRECCIÓN SIMPLE COMPLETADA.';
    
END $$;