-- Verificación completa del sistema de checkout
-- Ejecutar en Supabase SQL Editor

DO $$
DECLARE
    rec RECORD;
    table_count INTEGER;
    function_count INTEGER;
    constraint_count INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN SISTEMA DE CHECKOUT ===';
    RAISE NOTICE '';

    -- 1. Verificar tablas esenciales
    RAISE NOTICE '1. VERIFICANDO TABLAS ESENCIALES:';
    
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'products', 'cart_items', 'orders', 'order_items', 'user_addresses')
        ORDER BY table_name
    LOOP
        SELECT COUNT(*) INTO table_count 
        FROM information_schema.columns 
        WHERE table_name = rec.table_name AND table_schema = 'public';
        
        RAISE NOTICE '   ✓ Tabla % existe (%% columnas)', rec.table_name, table_count;
    END LOOP;

    -- Verificar tablas faltantes
    FOR rec IN 
        SELECT unnest(ARRAY['users', 'products', 'cart_items', 'orders', 'order_items', 'user_addresses']) AS required_table
        EXCEPT
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        RAISE NOTICE '   ✗ Tabla % FALTANTE', rec.required_table;
    END LOOP;

    RAISE NOTICE '';

    -- 2. Verificar relaciones foreign key críticas
    RAISE NOTICE '2. VERIFICANDO FOREIGN KEYS:';
    
    -- cart_items -> products
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'cart_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'product_id';
    
    IF constraint_count > 0 THEN
        RAISE NOTICE '   ✓ cart_items -> products FK existe';
    ELSE
        RAISE NOTICE '   ✗ cart_items -> products FK FALTANTE';
    END IF;

    -- orders -> users (buyer)
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'orders' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'buyer_id';
    
    IF constraint_count > 0 THEN
        RAISE NOTICE '   ✓ orders -> users (buyer) FK existe';
    ELSE
        RAISE NOTICE '   ✗ orders -> users (buyer) FK FALTANTE';
    END IF;

    -- order_items -> orders
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'order_items' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'order_id';
    
    IF constraint_count > 0 THEN
        RAISE NOTICE '   ✓ order_items -> orders FK existe';
    ELSE
        RAISE NOTICE '   ✗ order_items -> orders FK FALTANTE';
    END IF;

    RAISE NOTICE '';

    -- 3. Verificar funciones RPC
    RAISE NOTICE '3. VERIFICANDO FUNCIONES RPC:';
    
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_name = 'add_to_cart_safe' 
    AND routine_schema = 'public';
    
    IF function_count > 0 THEN
        RAISE NOTICE '   ✓ Función add_to_cart_safe existe';
    ELSE
        RAISE NOTICE '   ✗ Función add_to_cart_safe FALTANTE';
    END IF;

    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_name = 'cleanup_invalid_cart_items' 
    AND routine_schema = 'public';
    
    IF function_count > 0 THEN
        RAISE NOTICE '   ✓ Función cleanup_invalid_cart_items existe';
    ELSE
        RAISE NOTICE '   ✗ Función cleanup_invalid_cart_items FALTANTE';
    END IF;

    RAISE NOTICE '';

    -- 4. Verificar columnas críticas
    RAISE NOTICE '4. VERIFICANDO COLUMNAS CRÍTICAS:';
    
    -- cart_items
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'updated_at') THEN
        RAISE NOTICE '   ✓ cart_items.updated_at existe';
    ELSE
        RAISE NOTICE '   ✗ cart_items.updated_at FALTANTE';
    END IF;

    -- orders
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
        RAISE NOTICE '   ✓ orders.customer_name existe';
    ELSE
        RAISE NOTICE '   ✗ orders.customer_name FALTANTE';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'phone_number') THEN
        RAISE NOTICE '   ✓ orders.phone_number existe';
    ELSE
        RAISE NOTICE '   ✗ orders.phone_number FALTANTE';
    END IF;

    -- order_items
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price') THEN
        RAISE NOTICE '   ✓ order_items.price existe';
    ELSE
        RAISE NOTICE '   ✗ order_items.price FALTANTE';
    END IF;

    RAISE NOTICE '';

    -- 5. Verificar datos de prueba
    RAISE NOTICE '5. VERIFICANDO DATOS:';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COUNT(*) INTO table_count FROM users WHERE role = 'comprador';
        RAISE NOTICE '   • Compradores registrados: %', table_count;
        
        SELECT COUNT(*) INTO table_count FROM users WHERE role = 'vendedor';
        RAISE NOTICE '   • Vendedores registrados: %', table_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        SELECT COUNT(*) INTO table_count FROM products WHERE is_public = true;
        RAISE NOTICE '   • Productos públicos disponibles: %', table_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        SELECT COUNT(*) INTO table_count FROM cart_items;
        RAISE NOTICE '   • Items en carritos activos: %', table_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=== FIN VERIFICACIÓN ===';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR durante verificación: %', SQLERRM;
END $$;

-- También verificar permisos RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS Habilitado'
        ELSE 'RLS Deshabilitado'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'products', 'cart_items', 'orders', 'order_items', 'user_addresses')
ORDER BY tablename;