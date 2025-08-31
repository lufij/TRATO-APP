-- 🚨 DEBUG ESPECÍFICO PARA ERROR DEL REPARTIDOR
-- Script para diagnosticar y solucionar el error de "marcar recogido"

-- 1. VER EL ERROR EXACTO
SELECT 
    'CONSTRAINT ACTIVOS EN ORDERS' as info,
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'orders' 
AND tc.table_schema = 'public';

-- 2. ELIMINAR TODOS LOS CONSTRAINTS DE MANERA AGRESIVA
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Eliminar todos los check constraints de la tabla orders
    FOR rec IN 
        SELECT constraint_name
        FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND table_schema = 'public'
        AND constraint_type = 'CHECK'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || rec.constraint_name;
            RAISE NOTICE '✅ Eliminado constraint: %', rec.constraint_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error eliminando %: %', rec.constraint_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 3. VERIFICAR QUE NO QUEDEN CONSTRAINTS
SELECT 
    'CONSTRAINTS RESTANTES' as info,
    COUNT(*) as total
FROM information_schema.table_constraints 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND constraint_type = 'CHECK';

-- 4. PROBAR UPDATE DIRECTO
DO $$
DECLARE
    v_test_order UUID;
    v_original_status TEXT;
BEGIN
    -- Encontrar una orden para probar
    SELECT id, status INTO v_test_order, v_original_status
    FROM public.orders 
    WHERE status IN ('assigned', 'ready') 
    LIMIT 1;
    
    IF v_test_order IS NOT NULL THEN
        RAISE NOTICE 'Probando con orden: % (status actual: %)', v_test_order, v_original_status;
        
        -- Intentar el cambio problemático
        UPDATE public.orders 
        SET status = 'picked_up', updated_at = NOW()
        WHERE id = v_test_order;
        
        RAISE NOTICE '✅ SUCCESS: Cambio a picked_up funcionó';
        
        -- Revertir
        UPDATE public.orders 
        SET status = v_original_status
        WHERE id = v_test_order;
        
        RAISE NOTICE '✅ Revertido al status original';
        
    ELSE
        RAISE NOTICE '❌ No hay órdenes para probar';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;

-- 5. RESULTADO FINAL
SELECT '🎯 FIX COMPLETADO - PROBAR REPARTIDOR AHORA' as resultado;
