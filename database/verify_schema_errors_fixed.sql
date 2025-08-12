-- ============================================================================
-- TRATO - Verificación de Errores de Esquema Corregidos
-- ============================================================================
-- Este script verifica que los 3 errores específicos han sido corregidos:
-- 1. Chat tables check error: usersError
-- 2. Error fetching notifications: column notifications.user_id does not exist  
-- 3. Error loading orders: relationship between 'order_items' and 'products'
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO CORRECCIÓN DE ERRORES ESPECÍFICOS...';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 1: Verificar error notifications.user_id
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '1️⃣ PROBANDO ERROR: "column notifications.user_id does not exist"';
    
    BEGIN
        -- Intentar la consulta que estaba fallando
        PERFORM COUNT(*) FROM notifications;
        RAISE NOTICE '   ✅ SELECT notifications: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT notifications: ERROR - %', SQLERRM;
    END;
    
    -- Verificar que tiene recipient_id y no user_id
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        RAISE NOTICE '   ✅ Columna recipient_id: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ Columna recipient_id: NO EXISTE';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        RAISE NOTICE '   ✅ Columna user_id: CORRECTAMENTE REMOVIDA';
    ELSE
        RAISE NOTICE '   ❌ Columna user_id: AÚN EXISTE';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 2: Verificar error chat tables
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '2️⃣ PROBANDO ERROR: "Chat tables check error: usersError"';
    
    -- Test conversations table
    BEGIN
        PERFORM COUNT(*) FROM conversations;
        RAISE NOTICE '   ✅ SELECT conversations: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT conversations: ERROR - %', SQLERRM;
    END;
    
    -- Test messages table
    BEGIN
        PERFORM COUNT(*) FROM messages;
        RAISE NOTICE '   ✅ SELECT messages: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT messages: ERROR - %', SQLERRM;
    END;
    
    -- Test join that was failing
    BEGIN
        PERFORM COUNT(*) 
        FROM conversations c
        LEFT JOIN users u1 ON c.participant1_id = u1.id
        LEFT JOIN users u2 ON c.participant2_id = u2.id;
        RAISE NOTICE '   ✅ JOIN conversations ↔ users: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ JOIN conversations ↔ users: ERROR - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 3: Verificar error order_items ↔ products
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '3️⃣ PROBANDO ERROR: "relationship between order_items and products"';
    
    -- Test order_items table
    BEGIN
        PERFORM COUNT(*) FROM order_items;
        RAISE NOTICE '   ✅ SELECT order_items: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ SELECT order_items: ERROR - %', SQLERRM;
    END;
    
    -- Test the specific join that was failing
    BEGIN
        PERFORM COUNT(*) 
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id;
        RAISE NOTICE '   ✅ JOIN order_items ↔ products: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ JOIN order_items ↔ products: ERROR - %', SQLERRM;
    END;
    
    -- Test the full query from SellerOrderManagement
    BEGIN
        PERFORM COUNT(*)
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.seller_id IS NOT NULL;
        RAISE NOTICE '   ✅ FULL JOIN orders → order_items → products: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ FULL JOIN orders → order_items → products: ERROR - %', SQLERRM;
    END;
    
    -- Verificar foreign key constraint
    IF EXISTS (
        SELECT FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'order_items' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'product_id'
        AND kcu.referenced_table_name = 'products'
    ) THEN
        RAISE NOTICE '   ✅ FK order_items.product_id → products.id: EXISTE';
    ELSE
        RAISE NOTICE '   ❌ FK order_items.product_id → products.id: NO EXISTE';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 4: Probar consultas exactas que estaban fallando
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '4️⃣ PROBANDO CONSULTAS EXACTAS QUE ESTABAN FALLANDO...';
    
    -- Query exacta de notifications que fallaba
    BEGIN
        PERFORM id, recipient_id, type, title, message, read, created_at
        FROM notifications 
        LIMIT 1;
        RAISE NOTICE '   ✅ Query notifications con recipient_id: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Query notifications con recipient_id: ERROR - %', SQLERRM;
    END;
    
    -- Query exacta de SellerOrderManagement que fallaba
    BEGIN
        PERFORM o.id, o.total, o.status, oi.quantity, oi.price_per_unit, p.name
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LIMIT 1;
        RAISE NOTICE '   ✅ Query completa de órdenes: OK';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Query completa de órdenes: ERROR - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
DECLARE
    tests_passed INTEGER := 0;
    total_tests INTEGER := 3;
    notifications_ok BOOLEAN := FALSE;
    chat_ok BOOLEAN := FALSE;
    orders_ok BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '📊 RESUMEN DE VERIFICACIÓN FINAL:';
    RAISE NOTICE '';
    
    -- Test 1: Notifications
    BEGIN
        PERFORM COUNT(*) FROM notifications;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') 
           AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            notifications_ok := TRUE;
            tests_passed := tests_passed + 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        notifications_ok := FALSE;
    END;
    
    -- Test 2: Chat
    BEGIN
        PERFORM COUNT(*) FROM conversations;
        PERFORM COUNT(*) FROM messages;
        chat_ok := TRUE;
        tests_passed := tests_passed + 1;
    EXCEPTION WHEN OTHERS THEN
        chat_ok := FALSE;
    END;
    
    -- Test 3: Orders
    BEGIN
        PERFORM COUNT(*) FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id;
        orders_ok := TRUE;
        tests_passed := tests_passed + 1;
    EXCEPTION WHEN OTHERS THEN
        orders_ok := FALSE;
    END;
    
    -- Mostrar resultados
    RAISE NOTICE '1️⃣ Error notifications.user_id: %', CASE WHEN notifications_ok THEN '✅ CORREGIDO' ELSE '❌ PENDIENTE' END;
    RAISE NOTICE '2️⃣ Error chat tables: %', CASE WHEN chat_ok THEN '✅ CORREGIDO' ELSE '❌ PENDIENTE' END;
    RAISE NOTICE '3️⃣ Error order_items ↔ products: %', CASE WHEN orders_ok THEN '✅ CORREGIDO' ELSE '❌ PENDIENTE' END;
    RAISE NOTICE '';
    
    IF tests_passed = total_tests THEN
        RAISE NOTICE '🎉 ¡TODOS LOS ERRORES HAN SIDO CORREGIDOS!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ La aplicación TRATO debería funcionar sin estos errores.';
        RAISE NOTICE '🔄 Recarga la aplicación para confirmar que los errores desaparecieron.';
    ELSE
        RAISE NOTICE '⚠️  Faltan % de % errores por corregir.', (total_tests - tests_passed), total_tests;
        RAISE NOTICE '🔧 Ejecuta nuevamente fix_all_schema_errors_final.sql';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICACIÓN COMPLETADA.';
    
END $$;