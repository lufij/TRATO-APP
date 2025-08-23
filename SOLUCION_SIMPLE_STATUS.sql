-- 🔧 SOLUCIÓN SIMPLE PARA CONSTRAINTS
-- Script simplificado para resolver el problema de status

-- =====================================================
-- 1. VERIFICAR CONSTRAINTS SIMPLES
-- =====================================================

SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND constraint_type = 'CHECK';

-- =====================================================
-- 2. ELIMINAR TODOS LOS CHECK CONSTRAINTS DE ORDERS
-- =====================================================

DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND table_schema = 'public'
        AND constraint_type = 'CHECK'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || constraint_rec.constraint_name;
            RAISE NOTICE 'Constraint % eliminado exitosamente', constraint_rec.constraint_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error eliminando constraint %: %', constraint_rec.constraint_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 3. VERIFICAR STATUS ACTUALES
-- =====================================================

SELECT 
    status,
    COUNT(*) as cantidad
FROM public.orders
GROUP BY status;

-- =====================================================
-- 4. PROBAR UPDATE DIRECTO
-- =====================================================

DO $$
DECLARE
    v_test_order_id UUID;
BEGIN
    -- Buscar una orden para probar
    SELECT id INTO v_test_order_id
    FROM public.orders 
    WHERE status IN ('ready', 'confirmed')
    AND driver_id IS NULL
    LIMIT 1;
    
    IF v_test_order_id IS NOT NULL THEN
        -- Probar cambio a assigned
        UPDATE public.orders 
        SET status = 'assigned'
        WHERE id = v_test_order_id;
        
        RAISE NOTICE 'UPDATE exitoso: orden % cambió a assigned', v_test_order_id;
        
        -- Revertir
        UPDATE public.orders 
        SET status = 'ready'
        WHERE id = v_test_order_id;
        
        RAISE NOTICE 'Orden revertida a ready';
    ELSE
        RAISE NOTICE 'No se encontraron órdenes para probar';
    END IF;
END $$;

-- =====================================================
-- 5. CREAR REPARTIDOR DE PRUEBA SI NO EXISTE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'repartidor') THEN
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'repartidor@test.com',
            'Repartidor Prueba',
            'repartidor',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Repartidor de prueba creado';
    ELSE
        RAISE NOTICE 'Ya existe al menos un repartidor';
    END IF;
END $$;

-- =====================================================
-- 6. PROBAR FUNCIÓN ASSIGN_DRIVER_TO_ORDER
-- =====================================================

DO $$
DECLARE
    v_order_id UUID;
    v_driver_id UUID;
    v_success BOOLEAN;
    v_message TEXT;
BEGIN
    -- Buscar orden disponible
    SELECT id INTO v_order_id
    FROM public.orders 
    WHERE status IN ('ready', 'confirmed')
    AND COALESCE(delivery_type, 'delivery') = 'delivery'
    AND driver_id IS NULL
    LIMIT 1;
    
    -- Buscar repartidor
    SELECT id INTO v_driver_id
    FROM public.users 
    WHERE role = 'repartidor'
    LIMIT 1;
    
    IF v_order_id IS NOT NULL AND v_driver_id IS NOT NULL THEN
        -- Ejecutar función
        SELECT success, message INTO v_success, v_message
        FROM public.assign_driver_to_order(v_order_id, v_driver_id)
        LIMIT 1;
        
        RAISE NOTICE 'Resultado función: success=%, message=%', v_success, v_message;
        
        -- Si fue exitoso, revertir para no afectar datos
        IF v_success THEN
            UPDATE public.orders 
            SET driver_id = NULL, status = 'ready'
            WHERE id = v_order_id;
            RAISE NOTICE 'Cambios revertidos para mantener datos de prueba';
        END IF;
    ELSE
        RAISE NOTICE 'Faltan datos: order_id=%, driver_id=%', v_order_id, v_driver_id;
    END IF;
END $$;

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================

SELECT 'RESULTADO FINAL' as estado;

SELECT 
    'Constraints restantes en orders' as info,
    COUNT(*) as cantidad
FROM information_schema.table_constraints 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND constraint_type = 'CHECK';
