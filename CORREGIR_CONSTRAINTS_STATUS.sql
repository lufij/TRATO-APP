-- 🔍 VERIFICAR Y CORREGIR CONSTRAINTS DE STATUS
-- Script para identificar y solucionar problemas de constraints

-- =====================================================
-- 1. VERIFICAR CONSTRAINTS EXISTENTES
-- =====================================================

SELECT 
    'CONSTRAINTS EN TABLA ORDERS' as info,
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.table_schema = 'public';

-- =====================================================
-- 2. VERIFICAR VALORES ACTUALES DE STATUS
-- =====================================================

SELECT 
    'VALORES DE STATUS ACTUALES' as info,
    status,
    COUNT(*) as cantidad
FROM public.orders
GROUP BY status;

-- =====================================================
-- 3. ELIMINAR CONSTRAINT PROBLEMÁTICO SI EXISTE
-- =====================================================

DO $$
BEGIN
    -- Intentar eliminar constraint orders_status_check si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND constraint_name = 'orders_status_check'
        AND table_schema = 'public'
    ) THEN
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT orders_status_check';
        RAISE NOTICE 'Constraint orders_status_check eliminado';
    END IF;
    
    -- Intentar eliminar otros constraints de status que puedan existir
    FOR constraint_rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND table_schema = 'public'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || constraint_rec.constraint_name;
        RAISE NOTICE 'Constraint % eliminado', constraint_rec.constraint_name;
    END LOOP;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al eliminar constraints: %', SQLERRM;
END $$;

-- =====================================================
-- 4. CREAR NUEVO CONSTRAINT FLEXIBLE
-- =====================================================

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_flexible_check 
CHECK (status IN (
    'pending', 'confirmed', 'ready', 'assigned', 
    'picked-up', 'picked_up', 'in-transit', 'in_transit', 
    'delivered', 'cancelled', 'rejected'
));

-- =====================================================
-- 5. VERIFICAR QUE ORDERS PUEDE ACTUALIZARSE
-- =====================================================

-- Probar actualización de status
UPDATE public.orders 
SET status = 'ready' 
WHERE status = 'confirmed' 
AND id IN (
    SELECT id FROM public.orders 
    WHERE status = 'confirmed' 
    LIMIT 1
);

-- =====================================================
-- 6. PROBAR FUNCIÓN assign_driver_to_order
-- =====================================================

DO $$
DECLARE
    v_order_id UUID;
    v_driver_id UUID;
    v_result RECORD;
BEGIN
    -- Buscar una orden disponible
    SELECT id INTO v_order_id
    FROM public.orders 
    WHERE status IN ('ready', 'confirmed')
    AND COALESCE(delivery_type, 'delivery') = 'delivery'
    AND driver_id IS NULL
    LIMIT 1;
    
    -- Buscar un repartidor
    SELECT id INTO v_driver_id
    FROM public.users 
    WHERE role = 'repartidor'
    LIMIT 1;
    
    IF v_order_id IS NOT NULL AND v_driver_id IS NOT NULL THEN
        -- Probar la función
        SELECT * INTO v_result
        FROM public.assign_driver_to_order(v_order_id, v_driver_id);
        
        RAISE NOTICE 'Prueba de assign_driver_to_order: success=%, message=%', 
                     v_result.success, v_result.message;
        
        -- Revertir el cambio para no afectar datos reales
        UPDATE public.orders 
        SET driver_id = NULL, status = 'ready'
        WHERE id = v_order_id;
        
    ELSE
        RAISE NOTICE 'No se encontraron órdenes disponibles o repartidores para la prueba';
    END IF;
END $$;

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================

SELECT 'VERIFICACIÓN FINAL - Constraints después de la corrección' as info;

SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.table_schema = 'public'
AND tc.constraint_type = 'CHECK';
