-- =====================================================
-- TRATO - LIMPIEZA COMPLETA DE FOREIGN KEYS PROBLEMÁTICOS
-- =====================================================
-- Este script elimina TODOS los foreign keys problemáticos
-- Úsalo ANTES de ejecutar fix_all_foreign_key_errors_idempotent.sql
-- si tienes problemas de "constraint already exists"

BEGIN;

RAISE NOTICE 'INICIANDO LIMPIEZA DE FOREIGN KEYS PROBLEMÁTICOS';

-- =====================================================
-- ELIMINAR TODOS LOS FOREIGN KEYS DE ORDERS
-- =====================================================

DO $$
DECLARE
    constraint_rec RECORD;
    deleted_count INTEGER := 0;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'orders' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', 
            constraint_rec.table_name, constraint_rec.constraint_name);
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'ELIMINADO: % de tabla %', constraint_rec.constraint_name, constraint_rec.table_name;
    END LOOP;
    
    RAISE NOTICE 'ORDERS: % foreign keys eliminados', deleted_count;
END $$;

-- =====================================================
-- ELIMINAR TODOS LOS FOREIGN KEYS DE ORDER_ITEMS
-- =====================================================

DO $$
DECLARE
    constraint_rec RECORD;
    deleted_count INTEGER := 0;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'order_items' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', 
            constraint_rec.table_name, constraint_rec.constraint_name);
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'ELIMINADO: % de tabla %', constraint_rec.constraint_name, constraint_rec.table_name;
    END LOOP;
    
    RAISE NOTICE 'ORDER_ITEMS: % foreign keys eliminados', deleted_count;
END $$;

-- =====================================================
-- ELIMINAR TODOS LOS FOREIGN KEYS DE NOTIFICATIONS
-- =====================================================

DO $$
DECLARE
    constraint_rec RECORD;
    deleted_count INTEGER := 0;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'notifications' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', 
            constraint_rec.table_name, constraint_rec.constraint_name);
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'ELIMINADO: % de tabla %', constraint_rec.constraint_name, constraint_rec.table_name;
    END LOOP;
    
    RAISE NOTICE 'NOTIFICATIONS: % foreign keys eliminados', deleted_count;
END $$;

-- =====================================================
-- ELIMINAR TODOS LOS FOREIGN KEYS DE REVIEWS
-- =====================================================

DO $$
DECLARE
    constraint_rec RECORD;
    deleted_count INTEGER := 0;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'reviews' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', 
            constraint_rec.table_name, constraint_rec.constraint_name);
        deleted_count := deleted_count + 1;
        RAISE NOTICE 'ELIMINADO: % de tabla %', constraint_rec.constraint_name, constraint_rec.table_name;
    END LOOP;
    
    RAISE NOTICE 'REVIEWS: % foreign keys eliminados', deleted_count;
END $$;

-- =====================================================
-- ELIMINAR FOREIGN KEYS PROBLEMÁTICOS DE CART_ITEMS
-- =====================================================

DO $$
DECLARE
    constraint_rec RECORD;
    deleted_count INTEGER := 0;
    kept_count INTEGER := 0;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name, tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        -- Eliminar foreign keys problemáticos (product_id) pero mantener user_id
        IF constraint_rec.column_name = 'product_id' THEN
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', 
                constraint_rec.table_name, constraint_rec.constraint_name);
            deleted_count := deleted_count + 1;
            RAISE NOTICE 'ELIMINADO PROBLEMÁTICO: % (column: %)', 
                constraint_rec.constraint_name, constraint_rec.column_name;
        ELSE
            kept_count := kept_count + 1;
            RAISE NOTICE 'MANTENIDO: % (column: %)', 
                constraint_rec.constraint_name, constraint_rec.column_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'CART_ITEMS: % problemáticos eliminados, % seguros mantenidos', deleted_count, kept_count;
END $$;

COMMIT;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    total_orders_fks INTEGER;
    total_order_items_fks INTEGER;
    total_notifications_fks INTEGER;
    total_reviews_fks INTEGER;
    total_cart_bad_fks INTEGER;
    total_cart_good_fks INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_orders_fks
    FROM information_schema.table_constraints 
    WHERE table_name = 'orders' AND constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO total_order_items_fks
    FROM information_schema.table_constraints 
    WHERE table_name = 'order_items' AND constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO total_notifications_fks
    FROM information_schema.table_constraints 
    WHERE table_name = 'notifications' AND constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO total_reviews_fks
    FROM information_schema.table_constraints 
    WHERE table_name = 'reviews' AND constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO total_cart_bad_fks
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND kcu.column_name = 'product_id' AND tc.constraint_type = 'FOREIGN KEY';
    
    SELECT COUNT(*) INTO total_cart_good_fks
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' AND kcu.column_name != 'product_id' AND tc.constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'LIMPIEZA DE FOREIGN KEYS COMPLETADA';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ESTADO DESPUÉS DE LA LIMPIEZA:';
    RAISE NOTICE 'Orders foreign keys restantes: %', total_orders_fks;
    RAISE NOTICE 'Order_items foreign keys restantes: %', total_order_items_fks;
    RAISE NOTICE 'Notifications foreign keys restantes: %', total_notifications_fks;
    RAISE NOTICE 'Reviews foreign keys restantes: %', total_reviews_fks;
    RAISE NOTICE 'Cart foreign keys problemáticos: % (debe ser 0)', total_cart_bad_fks;
    RAISE NOTICE 'Cart foreign keys seguros mantenidos: %', total_cart_good_fks;
    RAISE NOTICE '';
    
    IF total_orders_fks = 0 AND total_order_items_fks = 0 AND total_notifications_fks = 0 
       AND total_reviews_fks = 0 AND total_cart_bad_fks = 0 THEN
        RAISE NOTICE '✅ LIMPIEZA EXITOSA';
        RAISE NOTICE '';
        RAISE NOTICE 'AHORA PUEDES EJECUTAR:';
        RAISE NOTICE 'fix_all_foreign_key_errors_idempotent.sql';
        RAISE NOTICE '';
        RAISE NOTICE 'Ese script recreará todos los foreign keys correctamente';
        RAISE NOTICE 'sin conflictos de "constraint already exists"';
    ELSE
        RAISE NOTICE '⚠ Algunos foreign keys no se pudieron eliminar';
        RAISE NOTICE 'Esto puede ser normal si hay dependencias críticas';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;

SELECT 'LIMPIEZA DE FOREIGN KEYS COMPLETADA - Ejecuta ahora fix_all_foreign_key_errors_idempotent.sql' as resultado;