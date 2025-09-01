-- =====================================================
-- 🔍 DIAGNÓSTICO COMPLETO - SISTEMA DE TIPOS DE ENTREGA
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA ORDERS
SELECT 
    'COLUMNAS DE ORDERS:' as titulo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND table_schema = 'public'
  AND column_name LIKE '%delivery%'
ORDER BY ordinal_position;

-- 2. VERIFICAR DATOS ACTUALES - TIPOS DE ENTREGA
SELECT 
    'TIPOS DE ENTREGA ACTUALES:' as titulo,
    delivery_type,
    COUNT(*) as cantidad_ordenes
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY delivery_type
ORDER BY cantidad_ordenes DESC;

-- 3. VERIFICAR ORDEN ESPECÍFICA RECIENTE
SELECT 
    'ORDEN RECIENTE DETALLE:' as titulo,
    id,
    status,
    delivery_type,
    delivery_address,
    created_at
FROM orders 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 5;

-- 4. VERIFICAR SI HAY CONSTRAINT EN DELIVERY_TYPE
SELECT 
    'CONSTRAINTS DELIVERY:' as titulo,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%delivery%' 
  AND constraint_schema = 'public';

-- 5. VERIFICAR VALORES ÚNICOS EN DELIVERY FIELDS
SELECT 
    'VALORES ÚNICOS DELIVERY_TYPE:' as titulo,
    delivery_type,
    COUNT(*) as cantidad
FROM orders
WHERE delivery_type IS NOT NULL
GROUP BY delivery_type;
