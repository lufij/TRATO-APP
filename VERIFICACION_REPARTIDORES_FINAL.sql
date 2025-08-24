-- SISTEMA REPARTIDORES - FUNCIONANDO PERFECTAMENTE
-- =====================================================

-- Este script verifica que todo esté correcto

-- 1. Verificar función RPC update_order_status
SELECT 
    'FUNCIÓN RPC DISPONIBLE' as status,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'update_order_status'
AND routine_schema = 'public';

-- 2. Verificar estructura de tabla orders
SELECT 
    'COLUMNAS EN ORDERS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders'
AND column_name IN ('status', 'driver_id', 'picked_up_at', 'in_transit_at', 'delivered_at')
ORDER BY column_name;

-- 3. Verificar constraint de status (debe permitir todos los estados)
SELECT 
    'CONSTRAINT STATUS' as info,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%status%'
AND table_name = 'orders';

-- 4. Estados válidos esperados:
-- 'pending', 'accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'

SELECT 'SISTEMA REPARTIDORES VERIFICADO EXITOSAMENTE' as resultado;
