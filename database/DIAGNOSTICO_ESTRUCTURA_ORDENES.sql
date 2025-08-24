-- =====================================================
-- DIAGNÓSTICO ESTRUCTURA DE ÓRDENES Y PRODUCTOS
-- =====================================================
-- Revisar diferencias entre productos normales y del día en las órdenes

-- 📊 1. VERIFICAR ESTRUCTURA DE TABLAS CLAVE
SELECT 
    '📋 ESTRUCTURA CART_ITEMS:' as seccion,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cart_items' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    '📋 ESTRUCTURA ORDER_ITEMS:' as seccion,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 📊 2. VERIFICAR CAMPOS PRODUCT_TYPE
SELECT 
    '🔍 PRODUCT_TYPE EN CART_ITEMS:' as diagnostico,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cart_items' AND column_name = 'product_type'
        ) THEN 'EXISTE ✅'
        ELSE 'NO EXISTE ❌'
    END as status;

SELECT 
    '🔍 PRODUCT_TYPE EN ORDER_ITEMS:' as diagnostico,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'order_items' AND column_name = 'product_type'
        ) THEN 'EXISTE ✅'
        ELSE 'NO EXISTE ❌'
    END as status;

-- 📊 3. VERIFICAR DATOS EXISTENTES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        RAISE NOTICE '📊 CART_ITEMS - Registros por tipo:';
        PERFORM pg_notify('cart_analysis', 'Analyzing cart items...');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE '📊 ORDER_ITEMS - Revisando estructura...';
        PERFORM pg_notify('order_analysis', 'Analyzing order items...');
    END IF;
END $$;

-- 📊 4. VERIFICAR CART_ITEMS CON PRODUCT_TYPE
SELECT 
    '🛒 CART_ITEMS por tipo:' as categoria,
    COALESCE(product_type, 'SIN_TIPO') as tipo_producto,
    COUNT(*) as cantidad,
    STRING_AGG(DISTINCT seller_id::text, ', ') as vendedores
FROM cart_items 
GROUP BY product_type
ORDER BY cantidad DESC;

-- 📊 5. VERIFICAR ÓRDENES EXISTENTES
SELECT 
    '📦 ÓRDENES por estado:' as categoria,
    status,
    COUNT(*) as cantidad,
    AVG(total) as promedio_total
FROM orders 
GROUP BY status
ORDER BY cantidad DESC;

-- 📊 6. VERIFICAR RELACIÓN PRODUCTOS - ÓRDENES
SELECT 
    '🔗 ORDEN_ITEMS:' as categoria,
    COUNT(*) as total_items,
    COUNT(DISTINCT order_id) as ordenes_distintas,
    COUNT(DISTINCT product_id) as productos_distintos,
    AVG(price) as precio_promedio
FROM order_items;

-- 📊 7. VERIFICAR FUNCIONAMIENTO DE PRODUCTOS DEL DÍA
SELECT 
    '🔥 PRODUCTOS DEL DÍA:' as categoria,
    COUNT(*) as total_productos,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as disponibles,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expirados,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as con_stock
FROM daily_products;

-- 📊 8. PROBLEMA ESPECÍFICO - ACTUALIZACIÓN DE ÓRDENES
SELECT 
    '⚠️ DIAGNÓSTICO UPDATEORDERSTATUS:' as problema,
    'Verificando si existe la función' as descripcion;

-- Verificar función update_order_status
SELECT 
    '🔧 FUNCIÓN UPDATE_ORDER_STATUS:' as verificacion,
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_name LIKE '%update_order%' 
AND routine_schema = 'public';

-- 📊 9. VERIFICAR PERMISOS Y POLÍTICAS RLS
SELECT 
    '🔒 POLÍTICAS RLS ORDERS:' as seccion,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'orders';

SELECT 
    '🔒 POLÍTICAS RLS ORDER_ITEMS:' as seccion,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'order_items';

-- 📊 10. RECOMENDACIONES
SELECT 
    '💡 RECOMENDACIONES:' as conclusion,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'order_items' AND column_name = 'product_type'
        ) 
        THEN 'AGREGAR product_type a order_items para distinguir productos normales vs del día'
        ELSE 'order_items ya tiene product_type ✅'
    END as recomendacion_1,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'update_order_status' AND routine_schema = 'public'
        )
        THEN 'CREAR función update_order_status para manejar estados de órdenes'
        ELSE 'Función update_order_status existe ✅'
    END as recomendacion_2;
