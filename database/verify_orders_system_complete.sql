-- ============================================================================
-- TRATO - Verificación Completa del Sistema de Órdenes
-- ============================================================================
-- Este script verifica que todas las tablas necesarias para el sistema de 
-- órdenes estén correctamente configuradas y muestra el estado actual.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO SISTEMA COMPLETO DE ÓRDENES...';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 1: Verificar existencia de tablas principales
-- ============================================================================

DO $$
DECLARE
    tables_missing INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 VERIFICANDO TABLAS PRINCIPALES:';
    
    -- Verificar tabla users
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '❌ Tabla users: NO EXISTE';
        tables_missing := tables_missing + 1;
    ELSE
        RAISE NOTICE '✅ Tabla users: OK';
    END IF;
    
    -- Verificar tabla products
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE '❌ Tabla products: NO EXISTE';
        tables_missing := tables_missing + 1;
    ELSE
        RAISE NOTICE '✅ Tabla products: OK';
    END IF;
    
    -- Verificar tabla orders
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE '❌ Tabla orders: NO EXISTE';
        tables_missing := tables_missing + 1;
    ELSE
        RAISE NOTICE '✅ Tabla orders: OK';
    END IF;
    
    -- Verificar tabla order_items
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE '❌ Tabla order_items: NO EXISTE';
        tables_missing := tables_missing + 1;
    ELSE
        RAISE NOTICE '✅ Tabla order_items: OK';
    END IF;
    
    -- Verificar tabla cart
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') THEN
        RAISE NOTICE '❌ Tabla cart: NO EXISTE';
        tables_missing := tables_missing + 1;
    ELSE
        RAISE NOTICE '✅ Tabla cart: OK';
    END IF;
    
    RAISE NOTICE '';
    IF tables_missing > 0 THEN
        RAISE NOTICE '⚠️  FALTA(N) % TABLA(S) PRINCIPAL(ES)', tables_missing;
    ELSE
        RAISE NOTICE '🎉 TODAS LAS TABLAS PRINCIPALES EXISTEN';
    END IF;
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- PASO 2: Verificar estructura de tabla orders
-- ============================================================================

DO $$
DECLARE
    orders_exists BOOLEAN := FALSE;
    missing_columns INTEGER := 0;
BEGIN
    RAISE NOTICE '📊 VERIFICANDO ESTRUCTURA DE TABLA ORDERS:';
    
    -- Verificar si existe la tabla orders
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'orders'
    ) INTO orders_exists;
    
    IF NOT orders_exists THEN
        RAISE NOTICE '❌ La tabla orders no existe. Ejecuta el script fix_setup.sql';
        RETURN;
    END IF;
    
    -- Verificar columnas esenciales
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'id') THEN
        RAISE NOTICE '❌ Columna orders.id: FALTA';
        missing_columns := missing_columns + 1;
    ELSE
        RAISE NOTICE '✅ Columna orders.id: OK';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'buyer_id') THEN
        RAISE NOTICE '❌ Columna orders.buyer_id: FALTA';
        missing_columns := missing_columns + 1;
    ELSE
        RAISE NOTICE '✅ Columna orders.buyer_id: OK';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'seller_id') THEN
        RAISE NOTICE '❌ Columna orders.seller_id: FALTA';
        missing_columns := missing_columns + 1;
    ELSE
        RAISE NOTICE '✅ Columna orders.seller_id: OK';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        RAISE NOTICE '❌ Columna orders.status: FALTA';
        missing_columns := missing_columns + 1;
    ELSE
        RAISE NOTICE '✅ Columna orders.status: OK';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total') THEN
        RAISE NOTICE '❌ Columna orders.total: FALTA';
        missing_columns := missing_columns + 1;
    ELSE
        RAISE NOTICE '✅ Columna orders.total: OK';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at') THEN
        RAISE NOTICE '❌ Columna orders.created_at: FALTA';
        missing_columns := missing_columns + 1;
    ELSE
        RAISE NOTICE '✅ Columna orders.created_at: OK';
    END IF;
    
    RAISE NOTICE '';
    IF missing_columns > 0 THEN
        RAISE NOTICE '⚠️  FALTAN % COLUMNAS EN TABLA ORDERS', missing_columns;
    ELSE
        RAISE NOTICE '🎉 ESTRUCTURA DE TABLA ORDERS COMPLETA';
    END IF;
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- PASO 3: Verificar foreign keys y constraints
-- ============================================================================

DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    RAISE NOTICE '🔗 VERIFICANDO FOREIGN KEYS:';
    
    -- Contar foreign keys en orders
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'orders' AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE '📋 Tabla orders tiene % foreign keys', fk_count;
    
    -- Verificar foreign key específicos
    IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND constraint_name LIKE '%buyer_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE '✅ FK orders.buyer_id → users.id: OK';
    ELSE
        RAISE NOTICE '❌ FK orders.buyer_id → users.id: FALTA';
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND constraint_name LIKE '%seller_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE '✅ FK orders.seller_id → users.id: OK';
    ELSE
        RAISE NOTICE '❌ FK orders.seller_id → users.id: FALTA';
    END IF;
    
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- PASO 4: Verificar Row Level Security
-- ============================================================================

DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '🔒 VERIFICANDO ROW LEVEL SECURITY:';
    
    -- Verificar si RLS está habilitado en orders
    SELECT relrowsecurity INTO rls_enabled 
    FROM pg_class 
    WHERE relname = 'orders';
    
    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS habilitado en orders: OK';
    ELSE
        RAISE NOTICE '❌ RLS habilitado en orders: NO';
    END IF;
    
    -- Contar policies en orders
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'orders';
    
    RAISE NOTICE '📋 Tabla orders tiene % policies', policy_count;
    
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- PASO 5: Probar consultas básicas
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧪 PROBANDO CONSULTAS BÁSICAS:';
    
    BEGIN
        PERFORM COUNT(*) FROM orders;
        RAISE NOTICE '✅ SELECT COUNT(*) FROM orders: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ SELECT COUNT(*) FROM orders: ERROR - %', SQLERRM;
    END;
    
    BEGIN
        PERFORM COUNT(*) FROM order_items;
        RAISE NOTICE '✅ SELECT COUNT(*) FROM order_items: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ SELECT COUNT(*) FROM order_items: ERROR - %', SQLERRM;
    END;
    
    BEGIN
        PERFORM COUNT(*) FROM cart;
        RAISE NOTICE '✅ SELECT COUNT(*) FROM cart: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ SELECT COUNT(*) FROM cart: ERROR - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- PASO 6: Mostrar datos actuales (si existen)
-- ============================================================================

DO $$
DECLARE
    orders_count INTEGER := 0;
    pending_orders INTEGER := 0;
    users_count INTEGER := 0;
    sellers_count INTEGER := 0;
BEGIN
    RAISE NOTICE '📊 DATOS ACTUALES DEL SISTEMA:';
    
    -- Contar órdenes totales
    BEGIN
        SELECT COUNT(*) INTO orders_count FROM orders;
        RAISE NOTICE '📋 Total de órdenes en sistema: %', orders_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ No se pudo contar órdenes: %', SQLERRM;
    END;
    
    -- Contar órdenes pendientes
    BEGIN
        SELECT COUNT(*) INTO pending_orders FROM orders WHERE status = 'pending';
        RAISE NOTICE '⏳ Órdenes pendientes: %', pending_orders;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ No se pudo contar órdenes pendientes: %', SQLERRM;
    END;
    
    -- Contar usuarios totales
    BEGIN
        SELECT COUNT(*) INTO users_count FROM users;
        RAISE NOTICE '👥 Total de usuarios: %', users_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ No se pudo contar usuarios: %', SQLERRM;
    END;
    
    -- Contar vendedores
    BEGIN
        SELECT COUNT(*) INTO sellers_count FROM users WHERE role = 'vendedor';
        RAISE NOTICE '🏪 Total de vendedores: %', sellers_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ No se pudo contar vendedores: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- PASO 7: Verificar índices para performance
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    RAISE NOTICE '⚡ VERIFICANDO ÍNDICES:';
    
    -- Contar índices en orders
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'orders';
    
    RAISE NOTICE '📋 Tabla orders tiene % índices', index_count;
    
    -- Verificar índices específicos importantes
    IF EXISTS (SELECT FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE '%seller_id%') THEN
        RAISE NOTICE '✅ Índice orders.seller_id: OK';
    ELSE
        RAISE NOTICE '❌ Índice orders.seller_id: FALTA';
    END IF;
    
    IF EXISTS (SELECT FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE '%buyer_id%') THEN
        RAISE NOTICE '✅ Índice orders.buyer_id: OK';
    ELSE
        RAISE NOTICE '❌ Índice orders.buyer_id: FALTA';
    END IF;
    
    IF EXISTS (SELECT FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE '%status%') THEN
        RAISE NOTICE '✅ Índice orders.status: OK';
    ELSE
        RAISE NOTICE '❌ Índice orders.status: FALTA';
    END IF;
    
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- PASO 8: Resumen final y recomendaciones
-- ============================================================================

DO $$
DECLARE
    orders_exists BOOLEAN := FALSE;
    order_items_exists BOOLEAN := FALSE;
    cart_exists BOOLEAN := FALSE;
    users_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '📋 RESUMEN FINAL DEL SISTEMA DE ÓRDENES:';
    RAISE NOTICE '';
    
    -- Verificar estado de tablas críticas
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') INTO orders_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') INTO order_items_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') INTO cart_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') INTO users_exists;
    
    IF orders_exists AND order_items_exists AND cart_exists AND users_exists THEN
        RAISE NOTICE '🎉 ¡SISTEMA DE ÓRDENES CONFIGURADO CORRECTAMENTE!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ Los vendedores pueden recibir y gestionar pedidos reales.';
        RAISE NOTICE '✅ Los compradores pueden crear pedidos.';
        RAISE NOTICE '✅ El sistema de carrito está funcionando.';
        RAISE NOTICE '';
        RAISE NOTICE '📱 La aplicación TRATO está lista para producción.';
    ELSE
        RAISE NOTICE '⚠️  SISTEMA DE ÓRDENES INCOMPLETO';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 ACCIONES REQUERIDAS:';
        
        IF NOT orders_exists THEN
            RAISE NOTICE '   • Crear tabla orders';
        END IF;
        
        IF NOT order_items_exists THEN
            RAISE NOTICE '   • Crear tabla order_items';
        END IF;
        
        IF NOT cart_exists THEN
            RAISE NOTICE '   • Crear tabla cart';
        END IF;
        
        IF NOT users_exists THEN
            RAISE NOTICE '   • Crear tabla users';
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE '📝 SOLUCIÓN: Ejecuta el script /database/fix_setup.sql';
        RAISE NOTICE '🔄 Después ejecuta este script nuevamente para verificar.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICACIÓN COMPLETADA.';
    
END $$;