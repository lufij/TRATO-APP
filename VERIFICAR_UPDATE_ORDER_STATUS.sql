-- =====================================================
-- 🔍 VERIFICAR Y CORREGIR FUNCIÓN update_order_status
-- =====================================================

-- PASO 1: Verificar si existe la función
SELECT 
    'FUNCIONES EXISTENTES:' as titulo,
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines 
WHERE routine_name LIKE '%update_order%' 
  AND routine_schema = 'public';

-- PASO 2: Verificar estados válidos en la tabla orders
SELECT 
    'CONSTRAINT ESTADOS:' as titulo,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%status%' 
  AND constraint_schema = 'public';

-- PASO 3: Verificar orden específica que falla
SELECT 
    'ORDEN PENDIENTE:' as titulo,
    id,
    status,
    seller_id,
    buyer_id,
    created_at
FROM orders 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;
