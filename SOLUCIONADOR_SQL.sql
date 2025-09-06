-- SOLUCIONADOR DE PROBLEMAS SQL - EJECUTAR PASO A PASO
-- =====================================================

-- PASO 1: VERIFICAR ESTRUCTURA ACTUAL
SELECT 'PASO 1: Verificando estructura actual' as paso;

-- Verificar tabla orders
SELECT 'Tabla orders existe:' as info, 
CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') 
     THEN 'SI' ELSE 'NO' END as resultado;

-- Verificar columnas importantes en orders
SELECT 'Columnas en orders:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY column_name;

-- PASO 2: AGREGAR COLUMNAS FALTANTES SI ES NECESARIO
SELECT 'PASO 2: Agregando columnas faltantes' as paso;

DO $$ 
BEGIN 
    -- Agregar completed_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Agregada columna completed_at';
    ELSE
        RAISE NOTICE 'Columna completed_at ya existe';
    END IF;
    
    -- Agregar delivered_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Agregada columna delivered_at';
    ELSE
        RAISE NOTICE 'Columna delivered_at ya existe';
    END IF;
    
    -- Agregar ready_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ready_at') THEN
        ALTER TABLE orders ADD COLUMN ready_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Agregada columna ready_at';
    ELSE
        RAISE NOTICE 'Columna ready_at ya existe';
    END IF;
    
    -- Agregar accepted_at si no existe
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'accepted_at') THEN
        ALTER TABLE orders ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Agregada columna accepted_at';
    ELSE
        RAISE NOTICE 'Columna accepted_at ya existe';
    END IF;
END 
$$;

-- PASO 3: CREAR FUNCIONES BÁSICAS (SIN NOTIFICATIONS)
SELECT 'PASO 3: Creando funciones básicas' as paso;

-- Función segura para completar pickup
CREATE OR REPLACE FUNCTION seller_mark_completed_pickup_safe(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        COALESCE(delivery_type, delivery_method)
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'ready' THEN
        RETURN QUERY SELECT false, ('La orden debe estar lista primero. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    -- Marcar como completado
    UPDATE orders 
    SET 
        status = 'completed',
        delivered_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, 'Orden completada exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función segura para marcar ready
CREATE OR REPLACE FUNCTION seller_mark_ready_safe(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
BEGIN
    -- Obtener información de la orden
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        COALESCE(delivery_type, delivery_method)
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type
    FROM orders 
    WHERE id = p_order_id;
    
    -- Validaciones
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'accepted' THEN
        RETURN QUERY SELECT false, ('La orden debe estar aceptada primero. Estado actual: ' || v_current_status)::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'ready'
    UPDATE orders 
    SET 
        status = 'ready',
        ready_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, ('Orden marcada como lista para ' || COALESCE(v_delivery_type, 'entrega'))::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 4: OTORGAR PERMISOS
SELECT 'PASO 4: Otorgando permisos' as paso;

GRANT EXECUTE ON FUNCTION seller_mark_completed_pickup_safe(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seller_mark_ready_safe(UUID, UUID) TO authenticated;

-- PASO 5: VERIFICAR QUE TODO ESTÉ CREADO
SELECT 'PASO 5: Verificación final' as paso;

SELECT 
    'Funciones creadas correctamente' as resultado,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('seller_mark_ready_safe', 'seller_mark_completed_pickup_safe', 'seller_accept_order', 'seller_mark_ready')
AND routine_schema = 'public'
ORDER BY routine_name;

SELECT 'Estructura de orders actualizada' as resultado, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
AND column_name IN ('status', 'delivery_type', 'delivery_method', 'completed_at', 'delivered_at', 'ready_at', 'accepted_at')
ORDER BY column_name;

SELECT 'SOLUCIÓN COMPLETA - Las funciones están listas para usar' as resultado;
